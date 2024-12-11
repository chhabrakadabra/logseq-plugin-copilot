import express, { Express, Request, Response } from "express";
import { getVectorStore, queryStore, createDocument, deleteDocument } from "./rag";
import { Page, Block } from "../types";


const app: Express = express();

async function main() {

    const vectorStore = await getVectorStore();

    app.use(express.json());

    app.post("/indexPage", async (req: Request, res: Response) => {
        const { page, blocks }: { page: Page, blocks: Block[] } = req.body;

        console.log(page, blocks);
        for (const block of blocks) {
            await deleteDocument(block.uuid, vectorStore);
            vectorStore.insert(createDocument(page, block));
        }
        res.send({ "status": "success" });
    });

    app.get("/query", async (req: Request, res: Response) => {
        const query: string = req.query.query as string;
        console.log("query", query);
        const response = await queryStore(query, vectorStore);
        res.send(response);
    });

    app.listen(8000, () => {
        console.log("Server is running on port 8000");
    });
}

main();