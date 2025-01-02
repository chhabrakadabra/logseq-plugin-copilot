import "@logseq/libs";
import { BlockEntity, BlockUUIDTuple } from "@logseq/libs/dist/LSPlugin";
import { VectorStoreBlockDoc } from "../types";

class PendingQuery {
    query: string;
    createdAt: number;
    status: "pending" | "completed" | "failed";
    results: VectorStoreBlockDoc[];
    error: string | null;

    constructor(query: string) {
        this.query = query;
        this.createdAt = Date.now();
        this.status = "pending";
        this.results = [];
        this.error = null;
    }
}

export class VectorStore {
    worker: Worker;
    pendingQueries: Map<string, PendingQuery>;

    constructor() {
        this.worker = new Worker(new URL("../workers/vectorStore.ts", import.meta.url), {
            type: "module",
        });
        this.pendingQueries = new Map();

        // Add worker message handler
        this.worker.onmessage = (event) => {
            const { type, id, results, error } = event.data;
            if (type === 'queryResponse') {
                const pendingQuery = this.pendingQueries.get(id);
                if (!pendingQuery) return;

                if (error) {
                    pendingQuery.status = 'failed';
                    pendingQuery.error = error;
                } else {
                    pendingQuery.status = 'completed';
                    pendingQuery.results = results;
                }
            }
        };
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
        console.log("Starting indexing loop");
        let pages = await logseq.Editor.getAllPages();
        if (!pages || pages.length === 0) {
            logseq.UI.showMsg("Copilot: No pages found", "warning");
            return;
        }

        // Temp: Only index small number of pages
        pages = pages.slice(0, 10);

        const docs: VectorStoreBlockDoc[] = (await Promise.all(pages.map(async (page) => {
            const pageBlocks = await this.collectAllBlocks(page.uuid);
            return pageBlocks.filter(
                (block) => block.content.length > 0
            ).map(
                (block) => {
                    return {
                        id: block.uuid,
                        content: block.content,
                    }
                }
            );
        }))).flat();

        for (const doc of docs) {
            this.worker.postMessage({
                type: "addDocument",
                document: doc,
            });
        }
        console.log("Indexing loop complete");
    }

    async query(query: string, numResults: number): Promise<VectorStoreBlockDoc[]> {
        const id = crypto.randomUUID();
        this.pendingQueries.set(id, new PendingQuery(query));
        this.worker.postMessage({
            type: "query",
            id,
            query,
            numResults,
        });

        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                const pendingQuery = this.pendingQueries.get(id);
                if (!pendingQuery) {
                    throw new Error("Query not found");
                }
                if (pendingQuery.status === "completed") {
                    resolve(pendingQuery.results);
                } else if (pendingQuery.status === "failed") {
                    reject(pendingQuery.error);
                } else if (Date.now() - pendingQuery.createdAt > 10000) {
                    reject("Query timed out");
                } else {
                    // Wait for the query to complete
                    return;
                }
                this.pendingQueries.delete(id);
                clearInterval(interval);
            }, 100);
        });
    }
}
