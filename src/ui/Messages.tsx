import React, { useCallback } from 'react';
import { AIMessage, HumanMessage, Message } from '../lib/chat';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { Theme } from '../lib/logseq';
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

export const AISuggestion: React.FC<{ message: string, theme: Theme }> = ({ message, theme }) => {
    const replace = useCallback(async () => {
        if (!message) return;
        const blockEntity = await logseq.Editor.getCurrentBlock()
        if (blockEntity) {
            await logseq.Editor.updateBlock(blockEntity.uuid, message);
        } else {
            logseq.UI.showMsg("Copilot: No block selected", "warning");
        }
    }, [message]);

    const insert = useCallback(async () => {
        if (!message) return;
        const blockEntity = await logseq.Editor.getCurrentBlock()
        if (blockEntity) {
            await logseq.Editor.insertBlock(blockEntity.uuid, message, {
                before: false,
                sibling: false
            });
        } else {
            logseq.UI.showMsg("Copilot: No block selected", "warning");
        }
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
                <Button
                    className="rounded-md flex items-center gap-2 border-solid border-2 mt-4 p-1 mr-1"
                    style={{
                        backgroundColor: theme.props.tertiaryBackgroundColor,
                        borderColor: theme.props.borderColor,
                    }}
                    onClick={replace}
                    aria-label="Replace current block"
                    title="Replace current block"
                >
                    <CheckIcon className="size-4" />
                </Button>
                <Button
                    className="rounded-md flex items-center gap-2 border-solid border-2 mt-4 p-1 mr-1"
                    style={{
                        backgroundColor: theme.props.tertiaryBackgroundColor,
                        borderColor: theme.props.borderColor,
                    }}
                    onClick={insert}
                    aria-label="Insert as sub-block"
                    title="Insert as sub-block"
                >
                    <BarsArrowDownIcon className="size-4" />
                </Button>
                <Button
                    className="rounded-md flex items-center gap-2 border-solid border-2 mt-4 p-1"
                    style={{
                        backgroundColor: theme.props.tertiaryBackgroundColor,
                        borderColor: theme.props.borderColor,
                    }}
                    onClick={() => {
                        logseq.UI.showMsg("Copied to clipboard", "success");
                        navigator.clipboard.writeText(message);
                    }}
                    aria-label="Copy"
                    title="Copy"
                >
                    <Square2StackIcon className="size-4" />
                </Button>
            </div>
        </div>
    );
}

export const AIMessageBox: React.FC<{ message: AIMessage, theme: Theme }> = ({ message, theme }) => {
    const notesRegex = /<note>(.*?)<\/note>/gs;
    const sections = [];
    let lastIndex = 0;
    for (const match of message.msg.matchAll(notesRegex)) {
        // Add text before the note if it exists
        if (match.index! > lastIndex) {
            const textBefore = message.msg.slice(lastIndex, match.index).trim();
            if (textBefore) {
                sections.push(<AICommentary message={textBefore} theme={theme} />);
            }
        }

        // Add the note
        sections.push(<AISuggestion message={match[1].trim()} theme={theme} />);

        lastIndex = match.index! + match[0].length;
    }
    // Add remaining text after last note if it exists
    const remainingText = message.msg.slice(lastIndex).trim();
    if (remainingText) {
        sections.push(<AICommentary message={remainingText} theme={theme} />);
    }

    return <>{sections}</>;
}

export const Messages: React.FC<{
    messages: Message[];
    theme: Theme;
}> = ({ messages, theme }) => {
    return (
        <div
            style={{ color: theme.props.primaryTextColor }}
            className="p-2 h-[50dvh] my-2 overflow-y-auto"
        >
            {messages.map((message) => (
                <div key={message.id} className="mb-4">
                    {message instanceof HumanMessage
                        ? <HumanMessageBox message={message} theme={theme} />
                        : <AIMessageBox message={message} theme={theme} />
                    }
                </div>
            ))}
        </div>
    );
};
