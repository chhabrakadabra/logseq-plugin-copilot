import logseqDevPlugin from "vite-plugin-logseq";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [logseqDevPlugin(), react()],
    define: {
        __DEV__: JSON.stringify(!process.env.PROD),
    },
    worker: {
        format: "es",
    }
});
