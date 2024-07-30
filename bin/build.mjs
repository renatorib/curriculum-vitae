#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import puppeteer from "puppeteer";
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";

const DEST = "build-new";

// Setup
await fs.mkdir(DEST, { recursive: true });
const css = await fs.readFile("src/style.css", "utf-8");
const template = (content) => `<!DOCTYPE html>
  <html>
    <head><meta charset="utf-8"><style>${css}</style></head>
    <body class="body">${content}</body>
  </html>
`;

// Build files
const browser = await puppeteer.launch();
await Promise.all(
  fg.globSync(["src/**/*.md"]).map(async (file) => {
    const name = path.basename(file).split(".").at(0);

    const html = template(
      micromark(await fs.readFile(file, "utf-8"), {
        allowDangerousHtml: true,
        extensions: [gfm()],
        htmlExtensions: [gfmHtml()],
      })
    );
    await fs.writeFile(`${DEST}/${name}.html`, html);

    const page = await browser.newPage();
    await page.setContent(html);
    await fs.writeFile(
      `${DEST}/${name}.pdf`,
      await page.pdf({
        format: "A4",
        margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
      })
    );
  })
);

process.exit(0);
