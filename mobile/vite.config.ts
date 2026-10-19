import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const repoRoot = path.resolve(import.meta.dirname, "..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Code shared with the website: resume types/templates and the resume document component.
      "@shared": path.resolve(repoRoot, "shared"),
      "@web": path.resolve(repoRoot, "client/src"),
    },
    // Shared files live outside this folder; make them use this app's single copy of React.
    dedupe: ["react", "react-dom", "lucide-react"],
  },
  server: { port: 5173, fs: { allow: [repoRoot] } },
  build: { outDir: "dist" },
});
