import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import { VitePWA } from "vite-plugin-pwa";
import compression from "vite-plugin-compression2";
import { visualizer } from "rollup-plugin-visualizer";

import dns from "dns";
import path from "path";

dns.setDefaultResultOrder("verbatim");

// `loadEnv` was imported but never called — Vite does NOT populate
// process.env with .env file values inside this config file (that only
// happens for import.meta.env in application code), so
// process.env.VITE_APP_API_SOCKET_URL was always undefined here and the
// /api proxy silently fell back to the Docker-compose hostname
// ("http://backend:5055"), which only resolves inside that network. Running
// `npm run dev` directly on the host (outside Docker) made every /api call
// fail with "getaddrinfo ENOTFOUND backend".
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
  build: {
    assetsDir: "@/assets",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": ["@windmill/react-ui"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-i18n": ["react-i18next", "i18next"],
        },
      },
    },
    chunkSizeWarningLimit: 500 * 1024,
  },
  plugins: [
    react({
      jsxImportSource: "react",
    }),

    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: false,
        type: "module",
        navigateFallback: "index.html",
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      includeAssets: [
        "src/assets/img/logo/*.png",
        "src/assets/img/*.png",
        "src/assets/img/*.jepg",
        "src/assets/img/*.webp",
        "favicon.ico",
      ],
      manifest: {
        theme_color: "#FFFFFF",
        background_color: "#FFFFFF",
        display: "standalone",
        orientation: "portrait",
        scope: ".",
        start_url: ".",
        id: ".",
        short_name: "Sofiagen",
        name: "Sofiagen | Admin Dashboard",
        description: "Sofiagen : Admin Dashboard",
        icons: [
          {
            src: "favicon.ico",
            sizes: "48x48",
            type: "image/x-icon",
          },
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icon-256x256.png",
            sizes: "256x256",
            type: "image/png",
          },
          {
            src: "/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
    compression(),
    visualizer({
      filename: "statistics.html",
      open: true,
    }),
  ],

  server: {
    host: "0.0.0.0",
    port: 5100,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 1000,
      binaryInterval: 3000,
    },
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 5100,
      clientPort: 5100,
    },
    middlewareMode: false,
    proxy: {
      "/api/": {
        target: env.VITE_APP_API_SOCKET_URL || "http://backend:5055",
        changeOrigin: true,
      },
    },
  },
  define: {
    "process.env": process.env,
    // global: {}, //enable this when running on dev/local mode
  },

  resolve: {
    alias: {
      // eslint-disable-next-line no-undef
      "@": path.resolve(__dirname, "./src/"),
      "@sofia/ui": path.resolve(__dirname, "../packages/ui"),
      "@sofia/hooks": path.resolve(__dirname, "../packages/hooks"),
    },
    dedupe: ["react", "react-dom"],
  },
  test: {
    global: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTest.js"],
  },
  };
});
