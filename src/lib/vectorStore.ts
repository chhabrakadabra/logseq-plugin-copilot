import "@logseq/libs";

import { CloseVectorWeb } from "@langchain/community/vectorstores/closevector/web";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { env } from "@xenova/transformers";
import { Document } from "@langchain/core/documents";
import Semaphore from "semaphore-promise";
import { BlockEntity, BlockUUIDTuple } from "@logseq/libs/dist/LSPlugin";

env.useBrowserCache = false;
env.allowLocalModels = false;
env.allowRemoteModels = true;

export class VectorStore {
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

    async query(query: string, k: number) {
        return await this.vectorStore.similaritySearch(query, k);
    }

    async collectAllBlocks(pageUuid: string): Promise<BlockEntity[]> {
        const pageBlocks = await logseq.Editor.getPageBlocksTree(pageUuid);
        const collectChildren = async (block: BlockEntity | BlockUUIDTuple): Promise<BlockEntity[]> => {
            if (Array.isArray(block)) {
                // This is a BlockUUIDTuple, fetch the block and its children.
                const fetchedBlock = await logseq.Editor.getBlock(block[1], { includeChildren: true });
                if (!fetchedBlock) {
                    console.error("Failed to fetch block: ", block);
                    return [];
                }
                block = fetchedBlock;
            }
            const children = block.children || [];
            const childrenBlocks = await Promise.all(children.map(collectChildren));
            return [block, ...childrenBlocks.flat()];
        }
        return (await Promise.all(pageBlocks.map(collectChildren))).flat();
    }

    async indexAllPages() {
        let pages = await logseq.Editor.getAllPages();
        if (!pages || pages.length === 0) {
            logseq.UI.showMsg("Copilot: No pages found", "warning");
            return;
        }

        // Temp: Only index 5 pages
        pages = pages.slice(0, 5);

        const errors = [];
        const semaphore = new Semaphore(5);
        await Promise.all(pages.map(async (page) => {
            try {
                const pageBlocks = await this.collectAllBlocks(page.uuid);
                await semaphore.acquire().then(async (release) => {
                    await this.vectorStore.addDocuments(
                        pageBlocks.filter(
                            (block) => block.content.length > 0
                        ).map(
                            (block) => {
                                return new Document({
                                    pageContent: block.content,
                                    metadata: {
                                        pageUuid: page.uuid,
                                        pageName: page.name,
                                        journalDay: page.journalDay?.toString(),
                                        blockUuid: block.uuid,
                                    },
                                    id: block.uuid,
                                })
                            }
                        )
                    );
                    release();
                })
            } catch (e) {
                errors.push(e);
            }
        }));
    }
}
