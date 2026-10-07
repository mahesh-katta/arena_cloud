/* Builds src/ into dist/. `node build.mjs --watch` rebuilds on every save. */
import * as esbuild from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await copyFile("src/index.html", "dist/index.html");
const opts = {
  entryPoints: ["src/main.jsx", "src/styles.css"],
  bundle: true, minify: true, outdir: "dist", jsx: "automatic",
  loader: { ".js": "jsx" }, target: ["es2020"], logLevel: "info",
};
if (process.argv.includes("--watch")) await (await esbuild.context(opts)).watch();
else await esbuild.build(opts);
