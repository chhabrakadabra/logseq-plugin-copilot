// import "@logseq/libs";

import { CloseVectorWeb } from "@langchain/community/vectorstores/closevector/web";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { env } from "@xenova/transformers";
import { Document } from "@langchain/core/documents";
import Semaphore from "semaphore-promise";

env.useBrowserCache = false;
env.allowLocalModels = false;
env.allowRemoteModels = true;

class VectorStoreWorker {
    embeddingsModel: HuggingFaceTransformersEmbeddings;
    vectorStore: CloseVectorWeb;

    constructor() {
        this.embeddingsModel = new HuggingFaceTransformersEmbeddings({
            model: "Xenova/all-MiniLM-L6-v2"
        });
        this.vectorStore = new CloseVectorWeb(this.embeddingsModel, {
            space: "cosine",
            numDimensions: 384,
            maxElements: 1000000,
        });
    }

    async addDocuments(documents: Document[]) {
        await this.vectorStore.addDocuments(documents);
    }

    async similaritySearch(query: string, k: number) {
        return await this.vectorStore.similaritySearch(query, k);
    }

    async indexAllPages() {
        // let pages = await logseq.Editor.getAllPages();
        // if (!pages || pages.length === 0) {
        //     logseq.UI.showMsg("Copilot: No pages found", "warning");
        //     return;
        // }

        // // Temp: Only index 5 pages
        // pages = pages.slice(0, 5);

        // const errors = [];
        // const semaphore = new Semaphore(5);
        // await Promise.all(pages.map(async (page) => {
        //     try {
        //         const pageBlocks = await logseq.Editor.getPageBlocksTree(page.uuid);
        //         await semaphore.acquire().then(async (release) => {
        //             console.log("Indexing page: ", page.name);
        //             await this.vectorStore.addDocuments(
        //                 pageBlocks.filter(
        //                     (block) => block.content.length > 0
        //                 ).map(
        //                     (block) => new Document({
        //                         pageContent: block.content,
        //                         metadata: {
        //                             pageUuid: page.uuid,
        //                             pageName: page.name,
        //                             journalDay: page.journalDay?.toString(),
        //                         },
        //                         id: block.uuid,
        //                     })
        //                 )
        //             );
        //             release();
        //         })
        //     } catch (e) {
        //         errors.push(e);
        //     }
        // }));
    }
}

const vectorStoreWorker = new VectorStoreWorker();
vectorStoreWorker.indexAllPages();



// Message handler for ongoing communication
self.addEventListener('message', async (event) => {
    const { type, payload } = event.data;
    console.log("Received message", type, payload);
});

// await vectorStore.addDocuments([new Document({
//     pageContent: "Hello, world!",
//     metadata: {
//         pageUuid: "123",
//         pageName: "Test",
//         journalDay: "2021-01-01",
//     },
//     id: "123",
// })]);
// console.log("Vector store: ", vectorStore);

// const res = await vectorStore.similaritySearch("Hello, world!", 1);
// console.log("Similarity search: ", res);

// logseq.FileStorage.allKeys().then(console.log);
