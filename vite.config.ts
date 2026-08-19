import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    // Override the Lovable default (cloudflare-module) so the server bundle
    // targets Vercel's Node runtime instead of Cloudflare Workers.
    preset: "vercel",
  },
});