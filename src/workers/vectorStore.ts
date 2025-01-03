import { CloseVectorWeb } from "@langchain/community/vectorstores/closevector/web";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { env } from "@xenova/transformers";
import { Document } from "@langchain/core/documents";
import { VectorStoreBlockDoc } from "../types";

env.useBrowserCache = false;
env.allowLocalModels = false;
env.allowRemoteModels = true;

const INDEXDB_NAME = "vectorStore";
const INDEXDB_STORE_NAME = "vectorStore";
const INDEXDB_VERSION = 1;
const MAX_DOCS_TO_ADD_AT_A_TIME = 10;
const INTERVAL_BETWEEN_ADDITIONS_MS = 50;


export class VectorStore {
    embeddingsModel: HuggingFaceTransformersEmbeddings;
    vectorStore: CloseVectorWeb;
    docsToBeAdded: VectorStoreBlockDoc[] = [];
    persistentDB: IDBDatabase | null = null;

    constructor() {
        this.embeddingsModel = new HuggingFaceTransformersEmbeddings({
            model: "Xenova/all-MiniLM-L6-v2",
            batchSize: 100
        });
        this.vectorStore = new CloseVectorWeb(this.embeddingsModel, {
            space: "cosine",
            numDimensions: 384,
            maxElements: 10 ** 6,
        });
        const dbRequest = indexedDB.open(INDEXDB_NAME, INDEXDB_VERSION);
        dbRequest.onsuccess = async () => {
            this.persistentDB = dbRequest.result;
            await this.loadFromPersistentDB();
            setInterval(this.addDocumentsFromQueue.bind(this), INTERVAL_BETWEEN_ADDITIONS_MS);
        };
        dbRequest.onerror = (event) => {
            console.error("Error opening indexedDB: ", event, ". Falling back to full indexing and in-memory storage.");
            setInterval(this.addDocumentsFromQueue.bind(this), INTERVAL_BETWEEN_ADDITIONS_MS);
        };
        dbRequest.onupgradeneeded = (event) => {
            const db = (event.target as IDBRequest).result;
            if (db.objectStoreNames.contains(INDEXDB_STORE_NAME)) {
                // For now, we don't support upgrading the vector store. Just recreate it.
                db.deleteObjectStore(INDEXDB_STORE_NAME);
            }
            db.createObjectStore(INDEXDB_STORE_NAME, { keyPath: "id" });
        };
    }

    async loadFromPersistentDB() {
        if (!this.persistentDB) {
            console.error("Persistent DB not open. Cannot load from it.");
            return;
        }

        return new Promise((resolve) => {
            const transaction = this.persistentDB!.transaction(INDEXDB_STORE_NAME, "readonly");
            const store = transaction.objectStore(INDEXDB_STORE_NAME);
            const docs: { vector: number[], document: Document }[] = [];

            store.openCursor().onsuccess = async (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    const doc = cursor.value;
                    docs.push({
                        vector: doc.vector,
                        document: new Document({
                            id: doc.id,
                            pageContent: doc.content,
                            metadata: {
                                docId: doc.id,
                            }
                        })
                    });
                    cursor.continue();
                } else {
                    if (docs.length > 0) {
                        console.log(`Adding ${docs.length} documents to vector store...`);
                        await this.vectorStore.addVectors(
                            docs.map(d => d.vector),
                            docs.map(d => d.document)
                        );
                    }
                    console.log("Loaded all documents from persistent DB.");
                    resolve(undefined);
                }
            };
        });
    }

    saveToPersistentDB(vectors: number[][], docs: VectorStoreBlockDoc[]) {
        if (!this.persistentDB) {
            console.error("Persistent DB not open. Cannot save to it.");
            return;
        }
        if (vectors.length !== docs.length) {
            throw new Error("Vectors and docs must have the same length.");
        }
        const transaction = this.persistentDB.transaction("vectorStore", "readwrite");
        const store = transaction.objectStore("vectorStore");
        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            const vector = vectors[i];
            store.put({
                id: doc.id,
                vector,
                content: doc.content,
            });
        }
    }

    /**
     * Check if the text of a document is already in the persistent DB.
     *
     * This is used to check if a document needs to be embedded again and added to the store. If the
     * text of the document has been changed, it needs to be embedded again. So we check by matching
     * the text and not the ID.
     *
     * @param doc - The document to check.
     * @returns True if there is a document in the persistent DB with the same text, false otherwise.
     */
    async isDocTextInPersistentDB(doc: VectorStoreBlockDoc) {
        if (!this.persistentDB) {
            console.error("Persistent DB not open. Cannot check if doc is in it.");
            return false;
        }
        const transaction = this.persistentDB.transaction(INDEXDB_STORE_NAME, "readonly");
        const store = transaction.objectStore(INDEXDB_STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.get(doc.id);
            request.onsuccess = (event) => {
                const result = (event.target as IDBRequest).result;
                resolve(result?.content === doc.content);
            };
            request.onerror = (event) => {
                reject(new Error(`Error checking if doc is in persistent DB: ${event.target}`));
            };
        });
    }

    queueDocumentForAddition(document: VectorStoreBlockDoc) {
        this.docsToBeAdded.push(document);
    }

    async addDocumentsFromQueue() {
        if (this.docsToBeAdded.length === 0) {
            return;
        }
        const docs = [];
        while (docs.length < MAX_DOCS_TO_ADD_AT_A_TIME) {
            const candidate = this.docsToBeAdded.shift();
            if (!candidate) break;

            if (await this.isDocTextInPersistentDB(candidate)) continue;

            docs.push(candidate);
        }
        console.log(`Adding ${docs.length} documents from queue. Queue size: ${this.docsToBeAdded.length}`);
        const texts = docs.map(doc => doc.content);
        const vectors = await this.embeddingsModel.embedDocuments(texts);
        await this.vectorStore.addVectors(vectors, docs.map(doc => new Document({
            id: doc.id,
            pageContent: doc.content,
            metadata: {
                docId: doc.id, // Because the vector store doesn't seem to return the doc ID
            },
        })));
        this.saveToPersistentDB(vectors, docs);
    }

    async query(query: string, numResults: number): Promise<VectorStoreBlockDoc[]> {
        console.log(`Querying vector store with total elements: ${this.vectorStore.instance.docstore._docs.size}`);
        const results = await this.vectorStore.similaritySearch(query, numResults);
        return results.map(result => ({
            id: result.id || result.metadata?.docId || "",
            content: result.pageContent,
        }));
    }
}

const vectorStore = new VectorStore();

onmessage = async (event) => {
    const message = event.data;
    if (message.type === "addDocument") {
        vectorStore.queueDocumentForAddition(message.document);
    } else if (message.type === "query") {
        try {
            const results = await vectorStore.query(message.query, message.numResults);
            postMessage({ type: "queryResponse", id: message.id, results, error: null });
        } catch (error) {
            postMessage({
                type: "queryResponse",
                id: message.id,
                results: [],
                error: error instanceof Error ? error.message : "Unknown error"
            });
        }
    }
}
