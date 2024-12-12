import "@logseq/libs";
import { indexPage, queryStore } from "./ragIndexing";

export async function logseqSetup() {
    logseq.App.registerCommandPalette(
        { key: "Open Copilot", label: "Open Copilot", keybinding: {binding:"mod+p"} },
        async () => {
            logseq.showMainUI({ autoFocus: true });
            setTimeout(() => {
                logseq.hideMainUI({ restoreEditingCursor: true });
            }, 1000)
        }
    );

    logseq.App.registerCommandPalette({
        key: "Reindex Copilot",
        label: "Reindex Copilot",
        keybinding: { binding: "mod+0" }
    }, async () => {
        const reindexingMsg = await logseq.UI.showMsg("Copilot: Reindexing...");

        const pages = await logseq.Editor.getAllPages();

        if (!pages || pages.length === 0) {
            logseq.UI.closeMsg(reindexingMsg);
            logseq.UI.showMsg("Copilot: No pages found", "warning");
            return;
        }

        const errors = [];
        await Promise.all(pages.map(async (page) => {
            try {
                const pageBlocks = await logseq.Editor.getPageBlocksTree(page.uuid);
                await indexPage(page, pageBlocks);
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

