import React from 'react';
import { AIMessage, HumanMessage, Message } from '../lib/chat';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { Theme } from '../lib/logseq';

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

export const AIMessageBox: React.FC<{ message: AIMessage, theme: Theme }> = ({ message, theme }) => {
    return (
        <div className="mb-4">
            <div className="markdown-body" dangerouslySetInnerHTML={{ __html: parseIncompleteMarkdown(message.msg) }} />
        </div>
    );
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
