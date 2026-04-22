/**
 * Patches partykit/dist/bin.mjs to fix a Windows path bug where
 * path.join(path.dirname(import.meta.url), "...") produces an invalid URL.
 * Replaced with new URL("...", import.meta.url) which handles all platforms correctly.
 */
const fs = require("fs");
const path = require("path");

const binPath = path.join(__dirname, "../node_modules/partykit/dist/bin.mjs");

if (!fs.existsSync(binPath)) {
  console.log("patch-partykit: bin.mjs not found, skipping");
  process.exit(0);
}

let content = fs.readFileSync(binPath, "utf8");

const pattern =
  /(fileURLToPath\d+)\(\s*path\d+\.join\(path\d+\.dirname\(import\.meta\.url\),\s*"([^"]+)"\)\s*\)/g;

let count = 0;
const patched = content.replace(pattern, (_, func, rel) => {
  count++;
  return `${func}(new URL("${rel}", import.meta.url))`;
});

if (count === 0) {
  console.log("patch-partykit: already patched or pattern not found");
} else {
  fs.writeFileSync(binPath, patched, "utf8");
  console.log(`patch-partykit: fixed ${count} occurrence(s) in bin.mjs`);
}
