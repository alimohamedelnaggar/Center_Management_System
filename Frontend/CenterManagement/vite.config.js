import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Tunnel hosts are a local development concern only. Keep them out of the
// repository and opt in per run with a comma-separated VITE_DEV_ALLOWED_HOSTS.
const devAllowedHosts = (process.env.VITE_DEV_ALLOWED_HOSTS || "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: devAllowedHosts,
  },
});
