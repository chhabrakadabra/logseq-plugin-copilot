import React, { useCallback } from 'react';
import { AIMessage, HumanMessage, Message } from '../lib/chat';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { Theme, replaceCurrentBlock, insertChildBlock } from '../lib/logseq';
import { Button } from '@headlessui/react';
import { Square2StackIcon, BarsArrowDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import "@logseq/libs";

const parseIncompleteMarkdown = (markdown: string) => {
    /**
     * Parses markdown text that may be incomplete (e.g. still streaming) into HTML
     * This method assumes that all but the last line of the markdown text is complete.
     * @param markdown The potentially incomplete markdown text to parse
     * @returns The markdown converted to basic HTML with line breaks
     */
    try {
        return DOMPurify.sanitize(marked.parse(markdown) as string);
    } catch (e) {
        // Try parsing all but the last line
        const lines = markdown.split("\n");
        const lastLine = lines.pop();
        try {
            const parsedLines = DOMPurify.sanitize(marked.parse(lines.join("\n")) as string);
            return parsedLines + "<br />" + lastLine;
        } catch (e) {
            return markdown;
        }
    }
}

export const HumanMessageBox: React.FC<{ message: HumanMessage, theme: Theme }> = ({ message, theme }) => {
    return (
        <div
            className="mb-4 ml-8 border-solid border-2 rounded-md p-2"
            style={{ borderColor: theme.props.borderColor, backgroundColor: theme.props.blockHighlightColor }}
        >
            <div className="markdown-body" dangerouslySetInnerHTML={{ __html: parseIncompleteMarkdown(message.msg) }} />
        </div>
    );
}

export const AICommentary: React.FC<{ message: string, theme: Theme }> = ({ message, theme }) => {
    return (
        <div className="markdown-body mb-2" dangerouslySetInnerHTML={{ __html: parseIncompleteMarkdown(message) }} />
    );
}

const NoteAction: React.FC<{ onClick: () => void, label: string, icon: React.ReactNode, theme: Theme }> = ({ onClick, label, icon, theme }) => {
    return (
        <Button
            className="rounded-md flex items-center gap-2 border-solid border-2 mt-4 p-1 ml-1"
            style={{
                backgroundColor: theme.props.tertiaryBackgroundColor,
                borderColor: theme.props.borderColor,
            }}
            onClick={onClick}
            aria-label={label}
            title={label}
        >
            {icon}
        </Button>
    )
}

export const AISuggestion: React.FC<{ message: string, theme: Theme }> = ({ message, theme }) => {
    const replace = useCallback(async () => {
        if (!message) return;
        replaceCurrentBlock(message);
    }, [message]);
    const insert = useCallback(async () => {
        if (!message) return;
        insertChildBlock(message);
    }, [message])
    const copy = useCallback(async () => {
        navigator.clipboard.writeText(message);
        logseq.UI.showMsg("Copied to clipboard", "success");
    }, [message])
    return (
        <div
            className="p-2 mb-2 rounded-md"
            style={{ backgroundColor: theme.props.secondaryBackgroundColor }}
        >
            <div
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: parseIncompleteMarkdown(message) }}
            />
            <div className="flex justify-end">
                <NoteAction onClick={replace} label="Replace current block" icon={<CheckIcon className="size-4" />} theme={theme} />
                <NoteAction onClick={insert} label="Insert as sub-block" icon={<BarsArrowDownIcon className="size-4" />} theme={theme} />
                <NoteAction onClick={copy} label="Copy" icon={<Square2StackIcon className="size-4" />} theme={theme} />
            </div>
        </div>
    );
}

export const AIMessageBox: React.FC<{ message: AIMessage, theme: Theme }> = ({ message, theme }) => {
    const notesRegex = /<note>(.*?)<\/note>/gs;
    const sections: { type: "commentary" | "suggestion", message: string }[] = [];
    let lastIndex = 0;
    for (const match of message.msg.matchAll(notesRegex)) {
        // Add text before the note if it exists
        if (match.index! > lastIndex) {
            const textBefore = message.msg.slice(lastIndex, match.index).trim();
            if (textBefore) {
                sections.push({ type: "commentary", message: textBefore });
            }
        }

        // Add the note
        sections.push({ type: "suggestion", message: match[1].trim() });

        lastIndex = match.index! + match[0].length;
    }
    // Add remaining text after last note if it exists
    const remainingText = message.msg.slice(lastIndex).trim();
    if (remainingText) {
        sections.push({ type: "commentary", message: remainingText });
    }
    // If the final section contains a `<note>` tag, but not a corresponding `</note>` tag, it might
    // just have not streamed yet. Pull it out into a separate note.
    if (sections.length > 0) {
        const finalSection = sections.pop()!;
        if (finalSection.type === "commentary" && finalSection.message.includes("<note>")) {
            const actualCommentary = finalSection.message.split("<note>")[0];
            const partialSuggestion = finalSection.message.split("<note>")[1];
            if (actualCommentary.length > 0) {
                sections.push({ type: "commentary", message: actualCommentary });
            }
            if (partialSuggestion.length > 0) {
                sections.push({ type: "suggestion", message: partialSuggestion });
            }
        } else {
            sections.push(finalSection);
        }
    }

    return <>{sections.map((section) => section.type === "commentary"
        ? <AICommentary message={section.message} theme={theme} />
        : <AISuggestion message={section.message} theme={theme} />)}</>;
}

export const Messages: React.FC<{
    messages: Message[];
    theme: Theme;
}> = ({ messages, theme }) => {
    return (
        <>
            <style>
                {`
                .messages-container {
                    scrollbar-width: thin;
                    scrollbar-color: ${theme.props.borderColor} transparent;
                    &::-webkit-scrollbar {
                        width: 5px;
                        height: 5px;
                    }
                    &::-webkit-scrollbar-track {
                        background: ${theme.props.secondaryBackgroundColor};
                    }
                    &::-webkit-scrollbar-thumb {
                        background-color: ${theme.props.borderColor};
                        border-radius: 6px;
                    }
                }
                `}
            </style>
            <div
                style={{ color: theme.props.primaryTextColor }}
                className="p-2 h-[50dvh] my-2 overflow-y-auto messages-container"
            >
                {messages.map((message) => (
                    message instanceof HumanMessage
                        ? <HumanMessageBox message={message} theme={theme} key={message.id} />
                        : <AIMessageBox message={message} theme={theme} key={message.id} />

                ))}
            </div>
        </>
    );
};
