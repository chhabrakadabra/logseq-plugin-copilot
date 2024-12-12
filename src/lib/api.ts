import { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin";
import { Page, Block } from "../../types";


export async function indexPage(pageEntity: PageEntity, blocksEntities: BlockEntity[]): Promise<void> {
    const page: Page = {
        name: pageEntity.name,
        uuid: pageEntity.uuid,
        journalDay: pageEntity.journalDay?.toString(),
    }

    const blocks: Block[] = blocksEntities.filter((block) => block.content.length > 0).map((block) => {
        return {
            uuid: block.uuid,
            content: block.content,
        }
    })

    if (blocks.length === 0) return;

    console.log(page, blocks);
    await fetch("http://localhost:8000/indexPage", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ page, blocks }),
    });
}

export async function queryStore(query: string) {
    const response = await fetch("http://localhost:8000/query?" + new URLSearchParams({ query }), {
        method: "GET",
        headers: {
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        throw new Error("Failed to query store");
    }
    return await response.json();
}
