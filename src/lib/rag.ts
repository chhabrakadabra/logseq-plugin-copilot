import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import "@logseq/libs";
import { StringOutputParser } from "@langchain/core/output_parsers";
import dedent from "dedent-js";
import { Runnable } from "@langchain/core/runnables";
import { Block } from "../types";
import { VectorStore } from "./vectorStore";
import logger from "./logger";
import { BlockEntity, BlockUUIDTuple, PageEntity } from "@logseq/libs/dist/LSPlugin.user";

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

    async retrieveLogseqBlocks(query: string): Promise<string[]> {
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
        logger.log("Logseq results:", results);
        // For some reason, the results from logseq.DB.q are not the same as the results from
        // logseq.Editor.getBlock. For one, the results from logseq.DB.q don't have a list of child
        // blocks. Let's just return block IDs here and process the unified set of blocks later.
        return (results || []).slice(0, 10).map(result => result.uuid);
    }

    async retrieveVectorStoreBlocks(query: string): Promise<string[]> {
        const topK = Number(logseq.settings!["VECTOR_SIMILARITY_TOP_K"]);
        const results = await this.vectorStore.query(query, topK);
        logger.log("Vector store results:", results);
        return results.map(result => result.id);
    }

    async processLogseqBlock(block: BlockEntity | BlockUUIDTuple, page: PageEntity | null): Promise<Block> {
        if (Array.isArray(block)) {
            const candidateBlock = await logseq.Editor.getBlock(block[1]);
            if (!candidateBlock) {
                throw new Error("Block not found");
            }
            block = candidateBlock;
        }
        const children = await Promise.all(block.children?.map(async child => await this.processLogseqBlock(child, null)) || []);
        return {
            id: block.uuid,
            content: block.content,
            page: page ? {
                id: page.uuid,
                name: page.name,
            } : null,
            children: children,
        };
    }

    async blockToContext(block: Block): Promise<string> {
        return dedent`
            <block>
                ${block.page ? `<title>${block.page.name}</title>` : ""}
                <content>
                ${block.content.slice(0, 1000)}
                </content>
                ${block.children.length > 0 ?
                `<children>
                    ${(await Promise.all(block.children.map(async child => this.blockToContext(await child)))).join("\n")}
                </children>` :
                ""}
            </block>
        `;
    }

    async run(query: string, onChunkReceived: (token: string) => void) {
        const logseqBlocksPromise = this.retrieveLogseqBlocks(query);
        const vectorStoreBlocksPromise = this.retrieveVectorStoreBlocks(query);

        let blockUUIDs = new Set<string>();
        try {
            (await logseqBlocksPromise).forEach(id => blockUUIDs.add(id));
        } catch (e) {
            logger.warn("Error retrieving logseq blocks", e);
        }
        try {
            (await vectorStoreBlocksPromise).forEach(id => blockUUIDs.add(id));
        } catch (e) {
            logger.warn("Error retrieving vector store blocks", e);
        }

        if (blockUUIDs.size === 0) {
            logger.warn("No blocks found. Attempting to answer question without any Logseq context.");
        }

        const blocks = await Promise.all((
            await Promise.all(Array.from(blockUUIDs).map(id => logseq.Editor.getBlock(id)))
        ).filter(block => block !== null).map(async block => {
            const page = await logseq.Editor.getPage(block.page.id);
            return await this.processLogseqBlock(block, page);
        }));
        const retrievedContext = dedent`
            <userNotes>
                ${(await Promise.all(blocks.map(block => this.blockToContext(block)))).join("\n")}
            </userNotes>
        `;
        logger.log(retrievedContext);
        const stream = await this.qaChain.stream({ query, retrievedContext, now: new Date().toLocaleString() });
        for await (const chunk of stream) {
            onChunkReceived(chunk as string);
        }
    }
}
