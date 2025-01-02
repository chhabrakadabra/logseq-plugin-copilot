interface VectorStoreBlockDoc {
    id: string;
    content: string;
}

interface Page {
    id: string;
    name: string;
}

interface Block {
    id: string;
    content: string;
    page: Page;
}

export type { VectorStoreBlockDoc, Page, Block };
