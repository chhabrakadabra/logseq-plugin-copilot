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

export class Theme {
    private static camelToKebab(str: string): string {
        return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    }
    private static defaultProps = {
        primaryBackgroundColor: "slate",
        secondaryBackgroundColor: "slate",
        tertiaryBackgroundColor: "slate",
        quaternaryBackgroundColor: "slate",
        activePrimaryColor: "white",
        activeSecondaryColor: "white",
        borderColor: "slate",
        secondaryBorderColor: "slate",
        tertiaryBorderColor: "slate",
        primaryTextColor: "white",
        secondaryTextColor: "white",
        blockHighlightColor: "slate"
    }

    constructor(
        public props: {
            primaryBackgroundColor: string;
            secondaryBackgroundColor: string;
            tertiaryBackgroundColor: string;
            quaternaryBackgroundColor: string;
            activePrimaryColor: string;
            activeSecondaryColor: string;
            borderColor: string;
            secondaryBorderColor: string;
            tertiaryBorderColor: string;
            primaryTextColor: string;
            secondaryTextColor: string;
            blockHighlightColor: string;
        } = Theme.defaultProps,
    ) { }

    private static normalizeColor(color: string): string {
        if (/^\d+\s\d+%\s\d+%$/.test(color)) {
            return `hsl(${color})`;
        }
        return color;
    }

    public static async fromLogseq(): Promise<Theme> {
        let mapToLogseqProps: { [key: string]: string } = {};
        Object.keys(Theme.defaultProps).forEach((key) => {
            mapToLogseqProps[key] = `--ls-${Theme.camelToKebab(key)}`;
        });
        const logseqPropVals = await logseq.UI.resolveThemeCssPropsVals(
            Object.values(mapToLogseqProps)
        );
        if (!logseqPropVals) {
            return new Theme();
        }
        let props: { [key: string]: string } = {};
        Object.keys(Theme.defaultProps).forEach((key) => {
            const color = logseqPropVals[mapToLogseqProps[key]] ?? Theme.defaultProps[key as keyof typeof Theme.defaultProps];
            props[key] = this.normalizeColor(color);
        });
        return new Theme(props as typeof Theme.defaultProps);
    }
}

export async function replaceCurrentBlock(content: string) {
    const blockEntity = await logseq.Editor.getCurrentBlock()
    if (blockEntity) {
        await logseq.Editor.updateBlock(blockEntity.uuid, content);
    } else {
        logseq.UI.showMsg("Copilot: No block selected", "warning");
    }
}

export async function insertChildBlock(content: string) {
    const blockEntity = await logseq.Editor.getCurrentBlock()
    if (blockEntity) {
        await logseq.Editor.insertBlock(blockEntity.uuid, content, {
            before: false,
            sibling: false
        });
    } else {
        logseq.UI.showMsg("Copilot: No block selected", "warning");
    }
}
