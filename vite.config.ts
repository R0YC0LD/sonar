import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Uretimde (GitHub Pages) site "/sonar/" alt yolunda yayinlanir;
// yerel gelistirmede kokte ("/") calisir.
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/sonar/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
}));
