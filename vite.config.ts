import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, ".", "");
  const issuer = new URL(env.VITE_MYDATUM_ISSUER || "https://auth.mydatum.ai").origin;
  return {
    plugins: [
      react(),
      {
        name: "mydatum-csp",
        transformIndexHtml(html) {
          const configured = html.replaceAll("__MYDATUM_ISSUER__", issuer);
          if (command !== "serve") return configured;
          return configured
            .replace("connect-src 'self'", "connect-src 'self' ws:")
            .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'");
        },
      },
    ],
  };
});
