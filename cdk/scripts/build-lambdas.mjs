import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cdkRoot = path.resolve(__dirname, "..");
const outputRoot = path.resolve(cdkRoot, "../terraform/dist");

const lambdaEntries = [
  ["upload-url", "lambda/upload-url/index.ts"],
  ["transcribe", "lambda/transcribe/index.ts"],
  ["job-status", "lambda/job-status/index.ts"],
  ["jobs-list", "lambda/jobs-list/index.ts"],
  ["job-delete", "lambda/job-delete/index.ts"],
  ["completion", "lambda/completion/index.ts"],
];

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const [name, relativeEntry] of lambdaEntries) {
  const outdir = path.join(outputRoot, name);
  await mkdir(outdir, { recursive: true });

  await build({
    bundle: true,
    entryPoints: [path.join(cdkRoot, relativeEntry)],
    format: "cjs",
    minify: true,
    outfile: path.join(outdir, "index.js"),
    platform: "node",
    sourcemap: false,
    target: "node20",
  });

  console.log(`Bundled ${name}`);
}
