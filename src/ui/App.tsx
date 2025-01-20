import React, { useCallback, useRef, useEffect, useState } from 'react';
import "@logseq/libs";
import { Dialog, DialogBackdrop, DialogPanel, Button, Textarea } from '@headlessui/react';
import { RagEngine } from '../lib/rag';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { AuthenticationError } from 'openai';


export const App: React.FC<{ ragEngine: RagEngine }> = ({ ragEngine }) => {
    const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

    const metaKey = isMac ? "⌘" : "Ctrl";

    const [query, setQuery] = useState("");
    const [results, setResults] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [theme, setTheme] = useState({ color: "white", "background-color": "slate", "border-color": "slate" });
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const onClose = () => {
        logseq.hideMainUI({ restoreEditingCursor: true });
        setQuery("");
        setResults("");
    }

    useEffect(() => {
        const target = inputRef.current;
        if (!target) return;
        target.style.height = "";
        target.style.height = target.scrollHeight + "px";
    }, [query]);

    const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
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
        try {
            await ragEngine.run(query, (chunk) => {
                setResults(prevResults => prevResults + chunk);
            });
        } catch (e) {
            const error = e as Error;
            if (error instanceof AuthenticationError) {
                logseq.UI.showMsg("Copilot: Authentication failed. Please check your OpenAI API key in settings", "error");
            } else {
                logseq.UI.showMsg("Copilot: Error running query", "error");
            }
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    }, [query]);

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

    const replace = useCallback(async () => {
        if (!results) return;
        const blockEntity = await logseq.Editor.getCurrentBlock()
        if (blockEntity) {
            await logseq.Editor.updateBlock(blockEntity.uuid, results);
            onClose();
        } else {
            logseq.UI.showMsg("Copilot: No block selected", "warning");
        }
    }, [results]);

    const insert = useCallback(async () => {
        if (!results) return;
        const blockEntity = await logseq.Editor.getCurrentBlock()
        if (blockEntity) {
            await logseq.Editor.insertBlock(blockEntity.uuid, results, {
                before: false,
                sibling: false
            });
            onClose();
        } else {
            logseq.UI.showMsg("Copilot: No block selected", "warning");
        }
    }, [results])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((isMac && event.metaKey && event.key === "Enter") ||
                (!isMac && event.ctrlKey && event.key === "Enter")) {
                insert();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMac, insert]);

    const updateTheme = async () => {
        const newTheme = await logseq.UI.resolveThemeCssPropsVals(["color", "background-color", "border-color"]);
        setTheme({ ...theme, ...newTheme });
    }

    logseq.App.onThemeModeChanged(updateTheme);
    logseq.App.onThemeChanged(updateTheme);
    useEffect(() => {
        updateTheme();
    }, []);

    const buttonStyle = "font-medium rounded-lg text-sm p-2.5 text-center "

    return (
        <Dialog
            open={true}
            onClose={onClose}
            className="fixed top-1/4 inset-0 z-50 overflow-y-auto">
            <DialogBackdrop className="fixed inset-0 bg-opacity-50 backdrop-filter backdrop-blur-sm" />
            <DialogPanel style={{ backgroundColor: theme["background-color"], borderColor: theme["border-color"], borderWidth: 1, borderStyle: "solid" }} className="max-w-2xl mx-auto rounded-lg shadow-2xl relative flex flex-col p-4">
                <form onSubmit={onSubmit}>
                    <Textarea
                        style={{ color: isProcessing ? "gray" : theme.color }}
                        className="p-2 placeholder-gray-200 dark:placeholder-gray-500 w-full bg-transparent border-0 outline-none resize-none overflow-hidden"
                        wrap="soft"
                        rows={1}
                        placeholder="Talk to your notes or press enter to bring in the current block..."
                        autoFocus={true}
                        id="logseq-copilot-search"
                        ref={inputRef}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                (e.target as HTMLFormElement).form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
                            }
                        }}
                        onChange={(e) => {
                            setQuery(e.target.value);
                        }}
                        disabled={isProcessing}
                        value={query}
                    />
                </form>

                {results && (
                    <>
                        <hr className="border-gray-600 mx-2" />
                        <div style={{ color: theme.color }} id="markdown-body" className="p-2 max-h-[50dvh] my-2 overflow-y-auto" dangerouslySetInnerHTML={{ __html: parseIncompleteMarkdown(results) }} />
                        <div className="flex justify-between">
                            <div>
                                <Button className={buttonStyle + "text-slate-700 dark:text-white bg-red-200 dark:bg-red-500"} onClick={onClose}>Close <span className="text-xs ml-0.5"><kbd>Esc</kbd></span></Button>
                            </div>
                            <div>
                                <Button className={buttonStyle + "text-white bg-gray-400 dark:bg-gray-500 mx-1"} onClick={replace}>Replace</Button>
                                <Button className={buttonStyle + "text-white bg-blue-400 dark:bg-blue-500 ml-1"} onClick={insert}>Insert <span className="text-xs ml-0.5">(<kbd>{metaKey}</kbd>+<kbd>Enter</kbd>)</span></Button>
                            </div>
                        </div>
                    </>
                )}
            </DialogPanel>
        </Dialog>
    );
};
