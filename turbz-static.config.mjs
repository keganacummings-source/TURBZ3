import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  define: { "import.meta.env.VITE_STATIC_HUNT": JSON.stringify("1") },
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    outDir: "/tmp/turbz-static",
    emptyOutDir: true,
    rollupOptions: { input: "/workspace/cloudflare.html" },
  },
});
