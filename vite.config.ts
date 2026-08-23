import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  worker: {
    format: "es",
  },
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("react-router")) {
              return "vendor-react-router";
            }
            if (id.includes("react")) {
              return "vendor-react";
            }
            if (id.includes("pdf-lib")) {
              return "vendor-pdf-lib";
            }
            if (id.includes("papaparse")) {
              return "vendor-papaparse";
            }
            if (id.includes("qrcode")) {
              return "vendor-qrcode";
            }
          }
        },
      },
    },
  },
});
