import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import puppeteer from "puppeteer";
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";

const DEST = "build";

const write = logger(fs.writeFile, (name) => `Generating ${name}`);
const template = (body, styles = "") => `<!DOCTYPE html>
  <html>
    <head><style>${styles}</style></head>
    <body class="body">${body}</body>
  </html>
`;

// Prepare
await fs.rm(DEST, { recursive: true, force: true });
const [css] = await Promise.all([
  fs.readFile("src/style.css", "utf-8"),
  fs.mkdir(`${DEST}/html`, { recursive: true }),
  fs.mkdir(`${DEST}/pdf`, { recursive: true }),
]);

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
      }),
      css
    );
    await write(`${DEST}/html/${name}.html`, html);

    const page = await browser.newPage();
    await page.setContent(html);
    await write(
      `${DEST}/pdf/${name}.pdf`,
      await page.pdf({
        format: "A4",
        margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
      })
    );
  })
);

process.exit(0);

function logger(fn, tpl) {
  return (...args) => {
    console.log(tpl(...args));
    return fn(...args);
  };
}
