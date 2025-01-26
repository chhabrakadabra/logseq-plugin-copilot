import React, { useCallback, useRef, useEffect, useState } from 'react';
import "@logseq/libs";
import { Dialog, DialogBackdrop, DialogPanel, Textarea } from '@headlessui/react';
import { RagEngine } from '../lib/rag';
import { AuthenticationError } from 'openai';
import { Placeholder } from './Placeholder';
import { AIMessage, HumanMessage, Message } from '../lib/chat';
import { Messages } from './Messages';
import { Theme } from '../lib/logseq';



export const App: React.FC<{ ragEngine: RagEngine }> = ({ ragEngine }) => {
    const [query, setQuery] = useState("");
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [theme, setTheme] = useState<Theme>(new Theme());
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const onClose = () => {
        logseq.hideMainUI({ restoreEditingCursor: true });
        setQuery("");
        setChatMessages([]);
    }

    useEffect(() => {
        const target = inputRef.current;
        if (!target) return;
        target.style.height = "";
        target.style.height = target.scrollHeight + "px";
    }, [query]);

    const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const newChatMessages = [...chatMessages, new HumanMessage(crypto.randomUUID(), query)];
        setChatMessages(newChatMessages);
        setIsProcessing(true);
        try {
            await ragEngine.run(newChatMessages, (chunk) => {
                setChatMessages(prevResults => {
                    const lastMessage = prevResults[prevResults.length - 1];
                    if (lastMessage instanceof AIMessage) {
                        return [
                            ...prevResults.slice(0, -1),
                            lastMessage.withChunk(chunk),
                        ];
                    }
                    return [...prevResults, new AIMessage(crypto.randomUUID(), chunk)];
                });
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
            setQuery("");
            setTimeout(() => {
                inputRef.current?.focus();
            }, 1000);
        }
    }, [query]);

    const updateTheme = async () => {
        const newTheme = await Theme.fromLogseq();
        setTheme(newTheme);
    }

    logseq.App.onThemeModeChanged(updateTheme);
    logseq.App.onThemeChanged(updateTheme);
    useEffect(() => {
        updateTheme();
    }, []);

    return (
        <Dialog
            open={true}
            onClose={onClose}
            className="fixed top-1/4 inset-0 z-50 overflow-y-auto">
            <DialogBackdrop className="fixed inset-0 bg-opacity-50 backdrop-filter backdrop-blur-sm" />
            <DialogPanel
                style={{ backgroundColor: theme.props.primaryBackgroundColor, borderColor: theme.props.borderColor, borderWidth: 1, borderStyle: "solid" }}
                className="max-w-2xl mx-auto rounded-lg shadow-2xl relative flex flex-col p-4"
            >
                {/* Chat messages */}
                {chatMessages.length > 0
                    ? <Messages theme={theme} messages={chatMessages} />
                    : <Placeholder theme={theme} />
                }

                {/* Chat input */}
                <form
                    onSubmit={onSubmit}
                    className="flex gap-2 border-solid border-2 rounded-lg"
                    style={{ borderColor: theme.props.borderColor }}
                >
                    <style>
                        {`
                            textarea::placeholder {
                                color: ${theme.props.primaryTextColor};
                            }
                        `}
                    </style>
                    <Textarea
                        style={{
                            color: isProcessing ? "gray" : theme.props.primaryTextColor
                        }}
                        className="p-2 w-full bg-transparent outline-none resize-none overflow-hidden"
                        wrap="soft"
                        rows={1}
                        placeholder={chatMessages.length === 0 ? "Talk to your notes..." : "Ask a follow-up question..."}
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
            </DialogPanel>
        </Dialog>
    );
};
