declare global {
    const __DEV__: boolean;
}

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
    page: Page | null;
    children: Block[];
}

export type { VectorStoreBlockDoc, Page, Block };
