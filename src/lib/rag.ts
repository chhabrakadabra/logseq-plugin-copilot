import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import "@logseq/libs";
import { StringOutputParser } from "@langchain/core/output_parsers";
import dedent from "dedent-js";
import { Runnable } from "@langchain/core/runnables";
import { queryStore } from "./api";
import { RetrievedBlock } from "../../types";

export class RagEngine {
    qaChain: Runnable;
    queryEnhancerChain: Runnable;

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
                For example given the question "What do I know about Deepspeed", you might
                conclude that the most important keyword here is "Deepspeed" and create the
                query \`"Deepspeed"\`. Or for example, given the question "Why did I choose to
                use VertexAI for project XYZ?", you might conclude that the blocks containing
                both VertexAI and XYZ would be most relevant and create the query
                \`(and "VertexAI" "XYZ")\`.

                Be as succinct as possible. Just output the query and nothing else.`],
            ["human", "{query}"],
        ]);
        const qaTemplate = ChatPromptTemplate.fromMessages([
            ["system", "You are a helpful assistant that can answer questions about the user's notes. The user's notes are: \n{retrievedContext}"],
            ["human", "{query}"],
        ]);
        const outputParser = new StringOutputParser();
        this.queryEnhancerChain = queryEnhancerTemplate.pipe(model).pipe(outputParser);
        this.qaChain = qaTemplate.pipe(model).pipe(outputParser);
    }

    async retrieveLogseqBlocks(query: string): Promise<RetrievedBlock[]> {
        const logseqQuery = await this.queryEnhancerChain.invoke({ query });
        const results = await logseq.DB.q(logseqQuery);
        console.log(results);
        return (results || []).slice(0, 50).map(result => ({
            uuid: result.uuid,
            content: result.content,
            pageName: result.page.name
        }))
    }

    async retrieveVectorStoreBlocks(query: string): Promise<RetrievedBlock[]> {
        const response = await queryStore(query);
        const blocks = response.blocks;
        console.log(blocks);
        return blocks;
    }

    async run(query: string) {
        const [logseqBlocks, vectorStoreBlocks] = await Promise.all([
            this.retrieveLogseqBlocks(query),
            this.retrieveVectorStoreBlocks(query),
        ]);
        const blocks = [...logseqBlocks, ...vectorStoreBlocks];
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
        console.log(retrievedContext);
        return this.qaChain.invoke({ query, retrievedContext });
    }
}
