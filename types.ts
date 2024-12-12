interface Page {
    name: string;
    uuid: string;
    journalDay?: string;
}

interface Block {
    uuid: string;
    content: string;
}

export type { Page, Block };