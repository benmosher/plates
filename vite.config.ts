import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/plates/",
  plugins: [react()],
  build: {
    manifest: true,
    outDir: "build", // CRA's default build output
  },
});
