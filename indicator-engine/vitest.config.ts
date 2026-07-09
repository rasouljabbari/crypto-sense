import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "risk-management-engine/tests/**/*.test.ts", "ai-explanation-engine/tests/**/*.test.ts"],
    environment: "node",
  },
});
