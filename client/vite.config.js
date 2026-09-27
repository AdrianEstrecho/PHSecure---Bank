import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The dev server proxies /api to Express, so the SPA and API share an origin (no CORS, SameSite=Strict cookies just work).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:5000", xfwd: true },
    },
  },
});
