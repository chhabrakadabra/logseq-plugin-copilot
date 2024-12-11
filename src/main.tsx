import "@logseq/libs";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

async function main() {
    const container = document.getElementById("app");
    if (!container) throw new Error("Root element not found");
    const root = ReactDOM.createRoot(container);
    root.render(<React.StrictMode><App /></React.StrictMode>);
}

logseq.ready(main).catch(console.error);
