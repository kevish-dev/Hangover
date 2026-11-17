import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve(".vercel/output");
const staticDir = resolve(output, "static");
const functionDir = resolve(output, "functions/api/website.func");
const template = await readFile("dist/index.html", "utf8");
if (!["<!-- seo-start -->", "<!-- seo-end -->", "<!-- route-start -->", "<!-- route-end -->"].every((marker) => template.includes(marker))) {
  throw new Error("The built HTML is missing SEO template markers");
}

await rm(output, { recursive: true, force: true });
await mkdir(functionDir, { recursive: true });
await cp("dist", staticDir, { recursive: true });
await rm(resolve(staticDir, "index.html"));
await Promise.all([
  ...["content.mjs", "handler.mjs", "metadata.mjs", "render.mjs"].map((filename) => copyFile(`src/seo/${filename}`, resolve(functionDir, filename))),
  copyFile("src/seo/website.mjs", resolve(functionDir, "website.js")),
  writeFile(resolve(functionDir, "package.json"), JSON.stringify({ type: "module" })),
  writeFile(resolve(functionDir, "index.html"), template),
  writeFile(resolve(functionDir, ".vc-config.json"), JSON.stringify({
    runtime: "nodejs22.x",
    handler: "website.js",
    launcherType: "Nodejs",
    maxDuration: 20,
  })),
  writeFile(resolve(output, "config.json"), JSON.stringify({
    version: 3,
    routes: [
      { src: "/api/website", check: true },
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/api/website?__path=/$1" },
    ],
  }, null, 2)),
]);
