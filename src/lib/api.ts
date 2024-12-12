import { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin";
import { Page, Block } from "../../types";


export async function clearIndex() {
    const res = await fetch("http://localhost:8000/resetIndex", {
        method: "POST",
    });
    if (!res.ok) {
        throw new Error("Failed to clear index");
    }
}

export async function indexPage(pageEntity: PageEntity, blocksEntities: BlockEntity[]): Promise<void> {
    console.log("Indexing page", pageEntity, blocksEntities);
    if (blocksEntities.length === 0) return;
    
    const page: Page = {
        name: pageEntity.name,
        uuid: pageEntity.uuid,
        journalDay: pageEntity.journalDay?.toString(),
    }

    const blocks: Block[] = blocksEntities.map((block) => {
        return {
            uuid: block.uuid,
            content: block.content,
        }
    })

    const res = await fetch("http://localhost:8000/indexPage", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ page, blocks }),
    });
    if (!res.ok) {
        throw new Error("Failed to index page");
    }
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
