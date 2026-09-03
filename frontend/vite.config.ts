import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_AUTH_API_BASE || "http://localhost:8081",
        changeOrigin: true
      },
      "/actuator": {
        target: process.env.VITE_AUTH_API_BASE || "http://localhost:8081",
        changeOrigin: true
      }
    }
  }
});


