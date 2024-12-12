import React, { useState } from 'react';
import "@logseq/libs";
import { Dialog, DialogPanel, Input } from '@headlessui/react';
import { RagEngine } from '../lib/rag';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export const App: React.FC = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const ragEngine = new RagEngine();

    const onClose = () => {
        logseq.hideMainUI({ restoreEditingCursor: true });
        setQuery("");
        setResults("");
    }

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (query.trim() === "") {
            const currentBlock = await logseq.Editor.getCurrentBlock();
            if (currentBlock) {
                const logbookStart = currentBlock.content.indexOf(":LOGBOOK:");
                const endOfString = logbookStart > 0 ? logbookStart : currentBlock.content.length;
                setQuery(currentBlock.content.slice(0, endOfString));
            }
            return;
        }
        setResults("");
        setIsProcessing(true);
        await ragEngine.run(query, (chunk) => {
            setResults(prevResults => prevResults + chunk);
        });
        setIsProcessing(false);
    }

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

    return (
        <Dialog
            open={true}
            onClose={onClose}
            className="fixed top-1/4 inset-0 z-50 overflow-y-auto">
            <DialogPanel className="bg-slate-700 max-w-2xl mx-auto rounded-lg shadow-2xl relative flex flex-col p-4">
                <form onSubmit={onSubmit}>
                    <Input
                        className={`p-5 ${isProcessing ? "text-gray-400" : "text-white"} placeholder-gray-200 w-full bg-transparent border-0 outline-none`}
                        placeholder="Talk to your notes or press enter to bring in the current block..."
                        autoFocus={true}
                        id="logseq-copilot-search"
                        onChange={(e) => {
                            setQuery(e.target.value);
                        }}
                        disabled={isProcessing}
                        value={query}
                    />
                </form>

                {results && (
                    <>
                        <hr className="border-gray-600 ml-5 mr-5" />
                        <div className="p-5 text-white" dangerouslySetInnerHTML={{ __html: parseIncompleteMarkdown(results) }} />
                    </>
                )}
            </DialogPanel>
        </Dialog>
    );
};
