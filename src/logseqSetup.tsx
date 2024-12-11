import "@logseq/libs";

export async function logseqSetup() {
    logseq.App.registerCommandShortcut(
        { binding: "mod+p" },
        async () => {
            logseq.showMainUI({ autoFocus: true });
            setTimeout(() => {
                logseq.hideMainUI({ restoreEditingCursor: true });
            }, 1000)
        }
    );

    logseq.setMainUIInlineStyle({ zIndex: 100 });
}