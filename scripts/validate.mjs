import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const errors = [];

if (manifest.manifest_version !== 3) errors.push("manifest_version must be 3");
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) errors.push("manifest version must use X.Y.Z");
const releaseVersion = process.env.RELEASE_VERSION?.replace(/^v/, "");
if (releaseVersion && manifest.version !== releaseVersion) {
  errors.push(`manifest version ${manifest.version} does not match release ${releaseVersion}`);
}

const expectedScripts = [
  manifest.background?.service_worker,
  ...(manifest.content_scripts || []).flatMap((entry) => entry.js || []),
  ...(manifest.commands?.["select-links-in-region"] ? ["selector.js"] : []),
  "options.js",
  "popup.js"
].filter(Boolean);

for (const script of expectedScripts) {
  try {
    await readFile(script);
  } catch {
    errors.push(`missing script referenced by the extension: ${script}`);
    continue;
  }

  const result = spawnSync(process.execPath, ["--check", script], { encoding: "utf8" });
  if (result.status !== 0) errors.push(`${script}: ${result.stderr.trim()}`);
}

for (const file of ["popup.html", "popup.css", "options.html", "options.css"]) {
  try {
    await readFile(file);
  } catch {
    errors.push(`missing required extension file: ${file}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated Franks ConnectWise v${manifest.version}.`);
