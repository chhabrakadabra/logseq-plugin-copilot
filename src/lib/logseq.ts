import "@logseq/libs";
import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";

export const settingsSchema: SettingSchemaDesc[] = [
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
    },
    {
        key: "VECTOR_SIMILARITY_TOP_K",
        type: "number",
        default: 20,
        title: "(Advanced) Vector Similarity Top K",
        description: "The number of results to return from the vector store",
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
            const apiKey = logseq.settings!["OPENAI_API_KEY"] as string;
            if (!apiKey) {
                logseq.UI.showMsg(
                    "Please set your OpenAI API key in the Logseq Copilot plugin settings.",
                    "error"
                );
                return;
            }
            logseq.showMainUI({ autoFocus: true });
            setTimeout(() => {
                document.getElementById("logseq-copilot-search")?.focus();
            }, 100);
        }
    );

    logseq.setMainUIInlineStyle({ zIndex: 100 });
}
