import { defineConfig } from "vite";
import mdx from "fumadocs-mdx/vite";
import * as MdxConfig from "./source.config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Use BASE_PATH env for GitHub Pages (/freecut/), default to / for local/Netlify
  base: process.env.BASE_PATH || "/",
  plugins: [react(), tsconfigPaths(), mdx(MdxConfig)],
});
