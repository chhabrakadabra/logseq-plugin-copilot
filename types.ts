interface Page {
    name: string;
    uuid: string;
    journalDay?: string;
}

interface Block {
    uuid: string;
    content: string;
}

interface RetrievedBlock extends Block {
    similarityScore?: number;
    pageName?: string;
}


export type { Page, Block, RetrievedBlock };
