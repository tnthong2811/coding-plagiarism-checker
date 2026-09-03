import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function attachProxyLogging(label: string) {
  return (proxy: any) => {
    proxy.on("proxyRes", (proxyRes: any, req: any) => {
      console.log(`[proxy:${label}] ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
    });
    proxy.on("error", (err: any, req: any) => {
      console.error(`[proxy:${label}] ${req.method} ${req.url} -> ERROR ${err?.message}`);
    });
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const authTarget = env.VITE_AUTH_API_BASE || "http://127.0.0.1:8081";
  const submissionTarget = env.VITE_SUBMISSION_API_BASE || "http://127.0.0.1:8082";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: authTarget,
          changeOrigin: true,
          timeout: 10000,
          proxyTimeout: 10000,
          configure: attachProxyLogging("auth")
        },
        "/actuator": {
          target: authTarget,
          changeOrigin: true,
          timeout: 10000,
          proxyTimeout: 10000,
          configure: attachProxyLogging("auth")
        },
        "/submission-api": {
          target: submissionTarget,
          changeOrigin: true,
          timeout: 10000,
          proxyTimeout: 10000,
          configure: attachProxyLogging("submission"),
          rewrite: (path) => path.replace(/^\/submission-api/, "")
        }
      }
    }
  };
});


