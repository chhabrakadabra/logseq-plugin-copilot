import React from 'react';
import "@logseq/libs";

export const App: React.FC = () => {
    // Prepare UI
    React.useEffect(() => {
        logseq.setMainUIInlineStyle({ zIndex: 100 });
    }, []);


    // Register shortcut
    React.useEffect(() => {
        console.log("register shortcut");
        logseq.App.registerCommandShortcut(
            { binding: "mod+p" },
            async () => {
                logseq.showMainUI({ autoFocus: true });
                setTimeout(() => {
                    logseq.hideMainUI({ restoreEditingCursor: true });
                }, 1000)
            }
        );
    }, []);

    return (
        <div>
            Hello Logseq!!!!
        </div>
    );
};
