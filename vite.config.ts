import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/plates/",
  plugins: [react()],
  build: {
    manifest: true,
    outDir: "build", // CRA's default build output
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/plate-math.ts", "src/workout-export.ts", "src/utils.ts"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
