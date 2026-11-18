import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["earthlike-scorn-acting.ngrok-free.dev"],
  },
  build: {
    rollupOptions: {
      output: {
        // Heavy dependencies get their own chunks. Because every page that
        // needs them is loaded with React.lazy, the browser downloads these
        // only when the relevant route is opened.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // React must stay in its own chunk. Otherwise Rollup pulls it into
          // whichever heavy manual chunk imports it first and every page ends
          // up downloading the chart library on startup.
          if (
            /node_modules[\\/](react|react-dom|react-is|scheduler)[\\/]/.test(id)
          ) {
            return "react-vendor";
          }
          if (
            /node_modules[\\/](recharts|victory-vendor|d3-[^\\/]+)[\\/]/.test(id)
          ) {
            return "charts";
          }
          if (id.includes("node_modules/xlsx/")) return "excel";
          if (id.includes("node_modules/@microsoft/signalr/")) {
            return "signalr";
          }
          if (id.includes("node_modules/zod/")) return "validation";
          if (id.includes("node_modules/qrcode/")) return "qr";
          if (id.includes("node_modules/jsbarcode/")) return "barcode";
          return undefined;
        },
      },
    },
  },
});
