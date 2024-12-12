import "./ui/style.css";
import "@logseq/libs";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./ui/App";
import { logseqSetup } from "./lib/logseq";

async function main() {
    await logseqSetup();
    const container = document.getElementById("app");
    if (!container) throw new Error("Root element not found");
    const root = ReactDOM.createRoot(container);
    root.render(<React.StrictMode><App /></React.StrictMode>);
}

logseq.ready(main).catch(console.error);
