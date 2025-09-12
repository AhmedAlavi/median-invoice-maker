import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate", // SW updates in the background
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "icons/192.png",
        "icons/512.png",
      ],
      manifest: {
        name: "Median Invoice Maker",
        short_name: "Invoice Maker",
        description: "Design. Develop. Maintain. Grow.",
        theme_color: "#0B0B0E",
        background_color: "#0B0B0E",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
        navigateFallback: "/index.html", // SPA fallback for offline nav
        additionalManifestEntries: [
          { url: "/data/companies.json", revision: null }, // <- ensure included
        ],
        runtimeCaching: [
          // 1) Companies JSON (remote) - cache with fast fallback
          {
            urlPattern:
              /https:\/\/ahmedalavi\.github\.io\/median_data\/invoice_companies\.json/,
            handler: "NetworkFirst",
            options: {
              cacheName: "companies",
              networkTimeoutSeconds: 2,
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 }, // 1 day
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // 2) Google fonts (if you use them)
          {
            urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // 3) External images/logos (if any non-base64)
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
});
