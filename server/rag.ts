import {
  Document,
  MetadataMode,
  NodeWithScore,
  VectorStoreIndex,
  Settings,
  HuggingFaceEmbedding,
  storageContextFromDefaults
} from "llamaindex";
import { Page, Block, RetrievedBlock } from "../types";

Settings.embedModel = new HuggingFaceEmbedding({
    modelType: "BAAI/bge-small-en-v1.5",
  });

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

export async function queryStore(query: string, index: VectorStoreIndex): Promise<RetrievedBlock[]> {
  const retriever = index.asRetriever();
  const results = await retriever.retrieve(query);
  return results.sort((a, b) => (b.score || 0) - (a.score || 0)).map(result => ({
    uuid: result.node.id_,
    content: result.node.getContent(MetadataMode.NONE).toString(),
    similarityScore: result.score,
    pageName: result.node.metadata?.pageName,
  }));
}

export { getVectorStore };
