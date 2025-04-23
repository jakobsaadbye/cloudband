// vite.config.ts
import { defineConfig } from "file:///Users/jsaad/cloudband/client/node_modules/.deno/vite@6.1.1/node_modules/vite/dist/node/index.js";
import deno from "file:///Users/jsaad/cloudband/client/node_modules/.deno/@deno+vite-plugin@1.0.4/node_modules/@deno/vite-plugin/dist/index.js";
import react from "file:///Users/jsaad/cloudband/client/node_modules/.deno/@vitejs+plugin-react@4.3.4/node_modules/@vitejs/plugin-react/dist/index.mjs";
import tailwindcss from "file:///Users/jsaad/cloudband/client/node_modules/.deno/@tailwindcss+vite@4.0.8/node_modules/@tailwindcss/vite/dist/index.mjs";
import svgr from "file:///Users/jsaad/cloudband/client/node_modules/.deno/vite-plugin-svgr@4.3.0/node_modules/vite-plugin-svgr/dist/index.js";
import path from "node:path";
var __vite_injected_original_dirname = "/Users/jsaad/cloudband/client";
var vite_config_default = defineConfig({
  plugins: [deno(), react(), tailwindcss(), svgr()],
  optimizeDeps: {
    exclude: ["@jakobsaadbye/teilen-sql"]
    // For some reason, vite decides to remove the worker from the package if not explicitly told NOT to, sigh ...
  },
  server: {
    fs: {
      allow: [
        path.resolve(__vite_injected_original_dirname),
        path.resolve(__vite_injected_original_dirname + "/../common/"),
        path.resolve(__vite_injected_original_dirname + "/../../../"),
        path.resolve(__vite_injected_original_dirname + "/../../../src/react/index.ts")
      ]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlUm9vdCI6ICIvVXNlcnMvanNhYWQvY2xvdWRiYW5kL2NsaWVudC8iLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9qc2FhZC9jbG91ZGJhbmQvY2xpZW50XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvanNhYWQvY2xvdWRiYW5kL2NsaWVudC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvanNhYWQvY2xvdWRiYW5kL2NsaWVudC92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgZGVubyBmcm9tICdAZGVuby92aXRlLXBsdWdpbidcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSdcbmltcG9ydCBzdmdyIGZyb20gXCJ2aXRlLXBsdWdpbi1zdmdyXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwibm9kZTpwYXRoXCI7XG5cbi8vIGh0dHBzOi8vdml0ZS5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW2Rlbm8oKSwgcmVhY3QoKSwgdGFpbHdpbmRjc3MoKSwgc3ZncigpXSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogW1wiQGpha29ic2FhZGJ5ZS90ZWlsZW4tc3FsXCJdIC8vIEZvciBzb21lIHJlYXNvbiwgdml0ZSBkZWNpZGVzIHRvIHJlbW92ZSB0aGUgd29ya2VyIGZyb20gdGhlIHBhY2thZ2UgaWYgbm90IGV4cGxpY2l0bHkgdG9sZCBOT1QgdG8sIHNpZ2ggLi4uXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIGZzOiB7XG4gICAgICBhbGxvdzogW1xuICAgICAgICBwYXRoLnJlc29sdmUoX19kaXJuYW1lKSxcbiAgICAgICAgcGF0aC5yZXNvbHZlKF9fZGlybmFtZSArIFwiLy4uL2NvbW1vbi9cIiksXG4gICAgICAgIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUgKyBcIi8uLi8uLi8uLi9cIiksXG4gICAgICAgIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUgKyBcIi8uLi8uLi8uLi9zcmMvcmVhY3QvaW5kZXgudHNcIiksXG4gICAgICBdXG4gICAgfVxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlRLFNBQVMsb0JBQW9CO0FBQ3RTLE9BQU8sVUFBVTtBQUNqQixPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sVUFBVTtBQUxqQixJQUFNLG1DQUFtQztBQVF6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsS0FBSyxHQUFHLE1BQU0sR0FBRyxZQUFZLEdBQUcsS0FBSyxDQUFDO0FBQUEsRUFDaEQsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLDBCQUEwQjtBQUFBO0FBQUEsRUFDdEM7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLElBQUk7QUFBQSxNQUNGLE9BQU87QUFBQSxRQUNMLEtBQUssUUFBUSxnQ0FBUztBQUFBLFFBQ3RCLEtBQUssUUFBUSxtQ0FBWSxhQUFhO0FBQUEsUUFDdEMsS0FBSyxRQUFRLG1DQUFZLFlBQVk7QUFBQSxRQUNyQyxLQUFLLFFBQVEsbUNBQVksOEJBQThCO0FBQUEsTUFDekQ7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
