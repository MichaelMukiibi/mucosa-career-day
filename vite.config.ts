import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { pageDescription } from "./src/event";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "event-metadata",
      transformIndexHtml(html) {
        return html.replace("%EVENT_DESCRIPTION%", pageDescription);
      },
    },
  ],
});
