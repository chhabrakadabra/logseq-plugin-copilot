import {
  Document,
  MetadataMode,
  NodeWithScore,
  VectorStoreIndex,
  Settings,
  HuggingFaceEmbedding,
  OpenAI,
  storageContextFromDefaults
} from "llamaindex";
import { Page, Block } from "../types";

Settings.embedModel = new HuggingFaceEmbedding({
    modelType: "BAAI/bge-small-en-v1.5",
  });

Settings.llm = new OpenAI({});

async function getVectorStore(): Promise<VectorStoreIndex> {
  // TODO: Make this a singleton
    const storageContext = await storageContextFromDefaults({
        persistDir: "./server/storage",
    });

    return VectorStoreIndex.fromDocuments([], {
        storageContext,
    });
}

export function createDocument(page: Page, block: Block): Document {
  return new Document({
      text: block.content,
      id_: block.uuid,
      metadata: {
        pageUuid: page.uuid,
        pageName: page.name,
        journalDay: page.journalDay,
      },
  });
}

export async function deleteDocument(uuid: string, index: VectorStoreIndex): Promise<void> {
  try {
    await index.deleteRefDoc(uuid, true);
  } catch (e) {
    console.log(e);
  }
}

export async function queryStore(query: string, index: VectorStoreIndex): Promise<string> {
    const queryEngine = index.asQueryEngine({similarityTopK: 10});
    const { message, sourceNodes } = await queryEngine.query({
        query,
    });

    console.log(message);
    if (sourceNodes) {
      sourceNodes.forEach((source: NodeWithScore, index: number) => {
        console.log(
          `\n${index}: Score: ${source.score} - ${source.node.getContent(MetadataMode.NONE).substring(0, 50)}...\n`,
        );
      });
    }

    return message.content.toString();
}

export { getVectorStore };