import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), babel({ presets: [reactCompilerPreset()] })],
  // eSewa redirects back to app.frontend-url, so the port can't drift to the
  // next free one when 5173 is busy.
  server: { port: 5173, strictPort: true },
});
