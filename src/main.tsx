import "./ui/style.css";
import "@logseq/libs";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./ui/App";
import { logseqSetup } from "./lib/logseq";
import { RagEngine } from "./lib/rag";

async function main() {
    await logseqSetup();
    const ragEngine = new RagEngine();

    logseq.onSettingsChanged(() => {
        ragEngine.setUpLLMChains();
    })

    const container = document.getElementById("app");
    if (!container) throw new Error("Root element not found");
    const root = ReactDOM.createRoot(container);
    root.render(<React.StrictMode><App ragEngine={ragEngine} /></React.StrictMode>);
}

logseq.ready(main).catch(console.error);
