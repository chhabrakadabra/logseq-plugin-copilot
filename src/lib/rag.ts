import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import "@logseq/libs";
import { StringOutputParser } from "@langchain/core/output_parsers";
import dedent from "dedent-js";
import { Runnable } from "@langchain/core/runnables";
import { Block } from "../types";
import { VectorStore } from "./vectorStore";
import logger from "./logger";

export class RagEngine {
    qaChain: Runnable;
    queryEnhancerChain: Runnable;
    vectorStore: VectorStore;

    constructor() {
        const model = new ChatOpenAI({
            configuration: {
                baseURL: logseq.settings!["OPENAI_BASE_URL"] as string,
                apiKey: logseq.settings!["OPENAI_API_KEY"] as string,
            },
            modelName: "gpt-4o-mini",
            maxTokens: 1000,
        });
        const queryEnhancerTemplate = ChatPromptTemplate.fromMessages([
            ["system", dedent`
                You are an expert in creating queries for Logseq. Your job is to convert a question
                from a user to a Logseq query that outputs relevant blocks that can be used to
                answer the user's question.

                Some examples:
                - given the question "What do I know about Deepspeed", you might
                conclude that the most important keyword here is "Deepspeed" and create the
                query \`"Deepspeed"\`.
                - given the question "Why did I choose to
                use VertexAI for project XYZ?", you might conclude that the blocks containing
                both VertexAI and XYZ would be most relevant and create the query
                \`(and "VertexAI" "XYZ")\`.

                Be as succinct as possible. Just output the query and nothing else. Don't surround
                the query produced with backticks`],
            ["human", "{query}"],
        ]);
        const qaTemplate = ChatPromptTemplate.fromMessages([
            ["system", dedent`
                You are a helpful assistant that can answer questions about the user's notes.
                You may use markdown to format your response.

                It is now: {now}.

                The user's notes are:
                {retrievedContext}
            `],
            ["human", "{query}"],
        ]);
        const outputParser = new StringOutputParser();
        this.queryEnhancerChain = queryEnhancerTemplate.pipe(model).pipe(outputParser);
        this.qaChain = qaTemplate.pipe(model).pipe(outputParser);

        this.vectorStore = new VectorStore();
        setTimeout(this.vectorStore.indexAllPages.bind(this.vectorStore), 3000);
    }

    async retrieveLogseqBlocks(query: string): Promise<Block[]> {
        // Note that the query enhancer may return a query wrapped in backticks.
        const logseqQuery = (await this.queryEnhancerChain.invoke({ query })).replace(/^`|`$/g, '');
        let results: any[] | null = null;
        try {
            results = await logseq.DB.q(logseqQuery);
        } catch (e) {
            logger.error("Error querying Logseq with enhanced query. Falling back.", e);
            const simpleQueryParts = query.replace(/[^a-zA-Z0-9\-]/g, '').split(" ");
            const simpleQuery = `(and ${simpleQueryParts.map(word => `"${word}"`).join(" ")})`;
            results = await logseq.DB.q(simpleQuery);
        }
        return (results || []).slice(0, 50).map(result => ({
            id: result.uuid,
            content: result.content,
            page: {
                id: result.page.uuid,
                name: result.page.name,
            },
        }))
    }

    async retrieveVectorStoreBlocks(query: string): Promise<Block[]> {
        const topK = logseq.settings!["VECTOR_SIMILARITY_TOP_K"] as number;
        const results = await this.vectorStore.query(query, topK);
        const blocks = (await Promise.all(results.map(result => logseq.Editor.getBlock(result.id)))).filter(block => block !== null);
        return await Promise.all(blocks.map(async block => {
            const page = await logseq.Editor.getPage(block.page.id);
            return {
                id: block.uuid,
                content: block.content,
                page: {
                    id: page?.uuid || "",
                    name: page?.name || "Unknown",
                },
            };
        }));
    }

    async run(query: string, onChunkReceived: (token: string) => void) {
        const logseqBlocksPromise = this.retrieveLogseqBlocks(query);
        const vectorStoreBlocksPromise = this.retrieveVectorStoreBlocks(query);

        let blocks: Block[] = [];
        try {
            blocks.push(...(await logseqBlocksPromise));
        } catch (e) {
            logger.warn("Error retrieving logseq blocks", e);
        }
        try {
            blocks.push(...(await vectorStoreBlocksPromise));
        } catch (e) {
            logger.warn("Error retrieving vector store blocks", e);
        }

        if (blocks.length === 0) {
            logger.warn("No blocks found. Attempting to answer question without any Logseq context.");
        }

        const blocksContext = blocks.map(block => dedent`
            <block>
                <title>${block.page.name}</title>
                <content>
                ${block.content.slice(0, 1000)}
                </content>
            </block>
        `).join("\n");
        const retrievedContext = dedent`
            <userNotes>
                ${blocksContext}
            </userNotes>
        `;
        const stream = await this.qaChain.stream({ query, retrievedContext, now: new Date().toLocaleString() });
        for await (const chunk of stream) {
            onChunkReceived(chunk as string);
        }
    }
}
