import express, { Express, Request, Response } from "express";
import { getVectorStore, queryStore, createDocument, deleteDocument, resetIndex } from "./rag";
import { Page, Block } from "../types";

const app: Express = express();

async function main() {

    let vectorStore = await getVectorStore();

    app.use(express.json());

    app.post("/resetIndex", async (req: Request, res: Response) => {
        vectorStore = await resetIndex();
        res.send({ "status": "success" });
    });

    app.post("/indexPage", async (req: Request, res: Response) => {
        const { page, blocks }: { page: Page, blocks: Block[] } = req.body;

        console.log(page, blocks);
        for (const block of blocks) {
            // Delete blocks before either saving or updating
            await deleteDocument(block.uuid, vectorStore);
            // No need to index empty blocks
            if (block.content) {
                vectorStore.insert(createDocument(page, block));
            }
        }
        res.send({ "status": "success" });
    });

    app.get("/query", async (req: Request, res: Response) => {
        const query: string = req.query.query as string;
        const topK: number = parseInt((req.query.topK || "10") as string, 10);

        console.log({query, topK});

        const blocks = await queryStore(query, topK, vectorStore);
        res.send({ blocks });
    });

    app.listen(8000, () => {
        console.log("Server is running on port 8000");
    });
}

main();
