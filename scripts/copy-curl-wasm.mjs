import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(projectRoot, "public");

mkdirSync(publicDir, { recursive: true });

for (const [source, target] of [
  ["node_modules/web-tree-sitter/tree-sitter.wasm", "tree-sitter.wasm"],
  ["node_modules/curlconverter/dist/tree-sitter-bash.wasm", "tree-sitter-bash.wasm"],
]) {
  copyFileSync(resolve(projectRoot, source), resolve(publicDir, target));
}
