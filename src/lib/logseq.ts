import "@logseq/libs";
import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user";
import { indexPage } from "./indexing";
import Semaphore from "semaphore-promise";

export const settingsSchema: SettingSchemaDesc[] = [
    {
        key: "OPENAI_API_KEY",
        type: "string",
        default: "",
        title: "OpenAI API Key",
        description: "Your OpenAI API key",
    },
    {
        key: "OPENAI_MODEL",
        type: "string",
        default: "gpt-4o-mini",
        title: "OpenAI Model",
        description: "The OpenAI model to use",
    },
    {
        key: "OPENAI_BASE_URL",
        type: "string",
        default: "https://api.openai.com/v1",
        title: "OpenAI Base URL",
        description: "The base URL for the OpenAI API. Most users shouldn't need to change this.",
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

    logseq.App.registerCommandPalette({
        key: "Reindex Copilot",
        label: "Reindex Copilot",
        keybinding: { binding: "mod+0" }
    }, async () => {
        const reindexingMsg = await logseq.UI.showMsg("Copilot: Reindexing...");
        const semaphore = new Semaphore(5);

        let pages = await logseq.Editor.getAllPages();

        if (!pages || pages.length === 0) {
            logseq.UI.closeMsg(reindexingMsg);
            logseq.UI.showMsg("Copilot: No pages found", "warning");
            return;
        }

        // Temp: Only index 100 pages
        pages = pages.slice(0, 100);

        const errors = [];
        await Promise.all(pages.map(async (page) => {
            try {
                const pageBlocks = await logseq.Editor.getPageBlocksTree(page.uuid);
                await semaphore.acquire().then(async (release) => {
                    await indexPage(page, pageBlocks);
                    release();
                })
            } catch (e) {
                errors.push(e);
            }
        }));

        if (errors.length > 0) {
            logseq.UI.closeMsg(reindexingMsg);
            logseq.UI.showMsg(`Copilot: Failed to index`, "error");
            return;
        }

        logseq.UI.closeMsg(reindexingMsg);
        logseq.UI.showMsg("Copilot: Done indexing " + pages.length + " pages", "success");
    });

    logseq.setMainUIInlineStyle({ zIndex: 100 });
}
