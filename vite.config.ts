import { defineConfig } from 'vite'
import deno from '@deno/vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [deno(), react(), tailwindcss()],
  optimizeDeps: {
    exclude: ["@jakobsaadbye/teilen-sql"] // For some reason, vite decides to remove the worker from the package if not explicitly told NOT to, sigh ...
  },
  server: {
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname + "/../../../"), // @Temporary - This will not be needed if teilen-sql was made into an npm package such that it could live in this project
        path.resolve(__dirname + "/../../../src/react/index.ts"), // @Temporary - This will not be needed if teilen-sql was made into an npm package such that it could live in this project
      ]
    }
  },
});
