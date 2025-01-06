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

    logseq.setMainUIInlineStyle({ zIndex: 100 });
}
