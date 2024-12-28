import "@logseq/libs";
import { BlockEntity, SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";
import { clearIndex, indexPage } from "./api";
import Semaphore from "semaphore-promise";

export const settingsSchema: SettingSchemaDesc[] = [
    {
        key: "SEARCH_HEADS",
        type: "enum",
        default: ["logseq"],
        title: "Search Heads",
        description: "Search head types to use",
        enumChoices: ["logseq", "vector"],
        enumPicker: "checkbox",
    },
    {
        key: "OPENAI_API_KEY",
        type: "string",
        default: "",
        title: "OpenAI API Key",
        description: "Your OpenAI API key",
    },
    {
        key: "OPENAI_BASE_URL",
        type: "string",
        default: "https://api.openai.com/v1",
        title: "OpenAI Base URL",
        description: "The base URL for the OpenAI API. Most users shouldn't need to change this.",
    },
    {
        key: "OPENAI_MODEL",
        type: "string",
        default: "gpt-4o-mini",
        title: "OpenAI Model",
        description: "The OpenAI model to use",
    },
    {
        key: "CHAT_DIALOG_SHORTCUT",
        type: "string",
        default: "mod+p",
        title: "Chat Dialog Shortcut",
        description: "The shortcut to open the chat dialog",
    }
]

export async function logseqSetup() {
    logseq.useSettingsSchema(settingsSchema);

    logseq.App.registerCommandPalette(
        {
            key: "Open Copilot",
            label: "Open Copilot",
            keybinding: { binding: logseq.settings!["CHAT_DIALOG_SHORTCUT"] as string }
        },
        async () => {
            logseq.showMainUI({ autoFocus: true });
        }
    );

    // logseq.App.registerCommandPalette({
    //     key: "Reindex Copilot",
    //     label: "Reindex Copilot",
    //     keybinding: { binding: "mod+0" }
    // }, async () => {
    //     const reindexingMsg = await logseq.UI.showMsg("Copilot: Reindexing...");

    //     try {
    //         await clearIndex();
    //     } catch (e) {
    //         logseq.UI.closeMsg(reindexingMsg);
    //         logseq.UI.showMsg("Copilot: Failed to clear index", "error");
    //         return;
    //     }

    //     const semaphore = new Semaphore(5);

    //     let pages = await logseq.Editor.getAllPages();

    //     if (!pages || pages.length === 0) {
    //         logseq.UI.closeMsg(reindexingMsg);
    //         logseq.UI.showMsg("Copilot: No pages found", "warning");
    //         return;
    //     }

    //     // Temp: Only index 500 pages
    //     pages = pages.slice(0, 500);

    //     const errors = [];
    //     await Promise.all(pages.map(async (page) => {
    //         try {
    //             const pageBlocks = await logseq.Editor.getPageBlocksTree(page.uuid);
    //             await semaphore.acquire().then(async (release) => {
    //                 await indexPage(page, pageBlocks.filter((block) => block.content.length > 0));
    //                 release();
    //             })
    //         } catch (e) {
    //             errors.push(e);
    //         }
    //     }));

    //     if (errors.length > 0) {
    //         logseq.UI.closeMsg(reindexingMsg);
    //         logseq.UI.showMsg(`Copilot: Failed to index`, "error");
    //         return;
    //     }

    //     logseq.UI.closeMsg(reindexingMsg);
    //     logseq.UI.showMsg("Copilot: Done indexing " + pages.length + " pages", "success");
    // });

    // // Hook for updating blocks
    // logseq.DB.onChanged(async ({blocks, txMeta}) => {
    //     // This hook is file level. We want only blocks, which have content. If content is empty,
    //     // it's likely to be deleted, which we still need to index.
    //     blocks = blocks.filter((block) => ["content", "page", "uuid"].reduce((acc, p) => acc && block.hasOwnProperty(p), true));
    //     if (blocks.length === 0) return;

    //     const pageBlocks: { [key: number]: [BlockEntity] } = {};
    //     if (txMeta?.outlinerOp === "delete-blocks") {
    //         blocks.forEach((block) => block.content = "");
    //     }

    //     blocks.forEach((block) => pageBlocks[block.page.id]?.push(block) || (pageBlocks[block.page.id] = [block]));
    //     const pages = await Promise.all(Object.keys(pageBlocks).map((pageId) => logseq.Editor.getPage(Number(pageId))));
    //     console.log("Blocks updated",pageBlocks);
    //     console.log("Pages",pages);

    //     try {
    //         await Promise.all(pages.filter(page => !!page).map(page => indexPage(page, pageBlocks[page.id])));
    //     } catch (e) {
    //         console.error(e);
    //         logseq.UI.showMsg("Copilot: Failed to update index.\nMaybe try to reindex.", "error");
    //     }
    // });

    logseq.setMainUIInlineStyle({ zIndex: 100 });
}
