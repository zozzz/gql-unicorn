import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "tsup"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
    entry: ["src/cli.ts"],
    format: "esm",
    target: "esnext",
    outDir: path.join(__dirname, "..", "..", "dist", "cli"),
    tsconfig: path.join(__dirname, "..", "..", "tsconfig.build.json"),
    sourcemap: true,
    clean: true,
    dts: true
})
