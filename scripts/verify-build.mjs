import { readFile, access } from "node:fs/promises";
import { resolve, basename } from "node:path";

// Catch accidental deployment of Vite's source index.html rather than dist/.
const output = resolve("dist");
const html = await readFile(resolve(output, "index.html"), "utf8");
if (/\/src\/|\.tsx?(["'?]|$)/.test(html)) {
  throw new Error("Production HTML references TypeScript/source files. Deploy dist/ after building.");
}
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]);
const styles = [...html.matchAll(/<link\b[^>]*\bhref="([^"]+\.css)"/g)].map(match => match[1]);
if (!scripts.length || !styles.length) {
  throw new Error("Production JavaScript or stylesheet entry is missing.");
}
for (const url of [...scripts, ...styles]) {
  const file = basename(url);
  if (!url.includes("/assets/") || !/\.(js|css)$/.test(file)) {
    throw new Error(`Unexpected production asset URL: ${url}`);
  }
  await access(resolve(output, "assets", file));
}
console.log(`Verified production HTML and ${scripts.length + styles.length} entry assets in dist/.`);
