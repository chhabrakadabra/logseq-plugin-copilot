import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import "@logseq/libs";
import { StringOutputParser } from "@langchain/core/output_parsers";
import dedent from "dedent-js";
import { Runnable } from "@langchain/core/runnables";
import { RetrievedBlock } from "../../types";
import { VectorStore } from "./vectorStore";

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

                The user's notes are:
                {retrievedContext}
            `],
            ["human", "{query}"],
        ]);
        const outputParser = new StringOutputParser();
        this.queryEnhancerChain = queryEnhancerTemplate.pipe(model).pipe(outputParser);
        this.qaChain = qaTemplate.pipe(model).pipe(outputParser);
        this.vectorStore = new VectorStore();
    }

    async retrieveLogseqBlocks(query: string): Promise<RetrievedBlock[]> {
        // Note that the query enhancer may return a query wrapped in backticks.
        const logseqQuery = (await this.queryEnhancerChain.invoke({ query })).replace(/^`|`$/g, '');
        let results: any[] | null = null;
        try {
            results = await logseq.DB.q(logseqQuery);
        } catch (e) {
            console.error("Error querying Logseq with enhanced query. Falling back.", e);
            const simpleQueryParts = query.replace(/[^a-zA-Z0-9\-]/g, '').split(" ");
            const simpleQuery = `(and ${simpleQueryParts.map(word => `"${word}"`).join(" ")})`;
            results = await logseq.DB.q(simpleQuery);
        }
        return (results || []).slice(0, 50).map(result => ({
            uuid: result.uuid,
            content: result.content,
            pageName: result.page.name
        }))
    }

    async retrieveVectorStoreBlocks(query: string): Promise<RetrievedBlock[]> {
        const results = await this.vectorStore.query(query, 5);
        console.log(results);
        return (results || []).slice(0, 50).map(result => ({
            uuid: result.id || result.metadata?.blockUuid,
            content: result.pageContent,
            pageName: result.metadata?.pageName,
        }));
    }

    async run(query: string, onChunkReceived: (token: string) => void) {
        const searchHeadSetting = logseq.settings!["SEARCH_HEADS"] as string[];
        if (searchHeadSetting.length === 0) {
            logseq.UI.showMsg("Copilot: Please select at least one search head type in settings", "error");
            return;
        }
        const searchHeads = [];

        if (searchHeadSetting.includes("logseq")) {
            searchHeads.push(this.retrieveLogseqBlocks(query));
        }
        if (searchHeadSetting.includes("vector")) {
            searchHeads.push(this.retrieveVectorStoreBlocks(query));
        }

        const blocks = (await Promise.all(searchHeads)).flat();
        const blocksContext = blocks.map(block => dedent`
            <block>
                <title>${block.pageName}</title>
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
        console.log("Retrieved context: ", retrievedContext);
        const stream = await this.qaChain.stream({ query, retrievedContext });
        for await (const chunk of stream) {
            onChunkReceived(chunk as string);
        }
    }
}
