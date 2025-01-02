import { CloseVectorWeb } from "@langchain/community/vectorstores/closevector/web";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { env } from "@xenova/transformers";
import { Document } from "@langchain/core/documents";
import { VectorStoreBlockDoc } from "../types";

env.useBrowserCache = false;
env.allowLocalModels = false;
env.allowRemoteModels = true;

export class VectorStore {
    embeddingsModel: HuggingFaceTransformersEmbeddings;
    vectorStore: CloseVectorWeb;
    docsToBeAdded: VectorStoreBlockDoc[] = [];

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
        setInterval(this.addDocumentsFromQueue.bind(this), 100);
    }

    queueDocumentForAddition(document: VectorStoreBlockDoc) {
        this.docsToBeAdded.push(document);
    }

    async addDocumentsFromQueue() {
        if (this.docsToBeAdded.length === 0) {
            return;
        }
        const docs = this.docsToBeAdded.splice(0, 10);
        console.log(`Adding ${docs.length} documents from queue. Queue size: ${this.docsToBeAdded.length}`);
        await this.vectorStore.addDocuments(docs.map(doc => new Document({
            id: doc.id,
            pageContent: doc.content,
            metadata: {
                docId: doc.id, // Because the vector store doesn't seem to return the doc ID
            },
        })));
    }

    async query(query: string, numResults: number): Promise<VectorStoreBlockDoc[]> {
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
