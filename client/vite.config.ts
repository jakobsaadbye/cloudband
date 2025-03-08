import { defineConfig } from 'vite'
import deno from '@deno/vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from "vite-plugin-svgr";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [deno(), react(), tailwindcss(), svgr()],
  optimizeDeps: {
    exclude: ["@jakobsaadbye/teilen-sql"] // For some reason, vite decides to remove the worker from the package if not explicitly told NOT to, sigh ...
  },
  server: {
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname + "/../common/"),
        path.resolve(__dirname + "/../../../"),
        path.resolve(__dirname + "/../../../src/react/index.ts"),
      ]
    }
  },
});
