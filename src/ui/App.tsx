import React from 'react';
import "@logseq/libs";
import { Dialog, DialogPanel, Input } from '@headlessui/react';
import { RagEngine } from '../lib/rag';

export const App: React.FC = () => {
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState("");

    const ragEngine = new RagEngine();

    const onClose = () => {
        logseq.hideMainUI({ restoreEditingCursor: true });
        setQuery("");
        setResults("");
    }

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const result = await ragEngine.run(query);
        setResults(result);
    }

    return (
        <Dialog
            open={true}
            onClose={onClose}
            className="fixed top-1/4 inset-0 z-50 overflow-y-auto">
            <DialogPanel className="bg-slate-700 max-w-2xl mx-auto rounded-lg shadow-2xl relative flex flex-col p-4">
                <form onSubmit={onSubmit}>
                    <Input
                        className="p-5 text-white placeholder-gray-200 w-full bg-transparent border-0 outline-none"
                        placeholder="Talk to your notes..."
                        autoFocus={true}
                        onChange={(e) => {
                            setQuery(e.target.value);
                        }}
                        value={query}
                    />
                </form>

                {results && (
                    <>
                        <hr />
                        <p className="p-5 text-white">
                            {results}
                        </p>
                    </>
                )}
            </DialogPanel>
        </Dialog>
    );
};
