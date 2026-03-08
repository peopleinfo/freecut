import { defineConfig } from "vite";
import mdx from "fumadocs-mdx/vite";
import * as MdxConfig from "./source.config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths(), mdx(MdxConfig)],
});
