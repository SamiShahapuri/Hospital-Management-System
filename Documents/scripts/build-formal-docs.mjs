import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { marked } from "file:///C:/Users/SAMI%20SHAHAPURI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/marked/lib/marked.esm.js";
import { chromium } from "file:///C:/Users/SAMI%20SHAHAPURI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const root = path.resolve("Documents");
const chromePath = process.env.HMS_CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const documents = [
  {
    source: "SOFTWARE_ARCHITECTURE_DESIGN.md",
    output: "Software_Architecture_and_Design.pdf",
    shortTitle: "Software Architecture and Design",
  },
  {
    source: "SECURITY_REQUIREMENTS.md",
    output: "Security_Requirements.pdf",
    shortTitle: "Security Requirements",
  },
];

marked.setOptions({ gfm: true, breaks: false });

const css = `
  @page { size: A4; margin: 20mm 17mm 20mm 17mm; }
  * { box-sizing: border-box; }
  html { font-family: "Arial", "Helvetica", sans-serif; color: #17202a; font-size: 10.2pt; line-height: 1.48; }
  body { margin: 0; }
  h1, h2, h3, h4 { color: #000; font-weight: 700; page-break-after: avoid; }
  h1 { font-size: 24pt; line-height: 1.15; margin: 0 0 18pt; text-align: center; }
  h1 + p { text-align: center; margin-top: 0; }
  h2 { font-size: 15pt; margin: 20pt 0 8pt; border-bottom: 1px solid #b8c4ce; padding-bottom: 4pt; }
  h3 { font-size: 12pt; margin: 15pt 0 6pt; }
  h4 { font-size: 10.5pt; margin: 12pt 0 5pt; }
  p { margin: 0 0 8pt; orphans: 3; widows: 3; }
  ul, ol { margin: 4pt 0 10pt 19pt; padding: 0; }
  li { margin: 2pt 0; }
  code { font-family: "Consolas", monospace; font-size: 9pt; background: #f3f5f7; padding: 1px 3px; border-radius: 2px; }
  pre { background: #f4f6f8; border: 1px solid #d8dee4; padding: 10pt; white-space: pre-wrap; page-break-inside: avoid; font-size: 8.6pt; line-height: 1.35; }
  pre code { background: transparent; padding: 0; }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0 14pt; font-size: 8.8pt; page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid #c8d0d8; padding: 6pt 7pt; vertical-align: top; overflow-wrap: break-word; word-break: normal; }
  th { background: #1f4e78; color: #fff; font-weight: 700; text-align: left; }
  tbody tr:nth-child(even) { background: #f3f7fa; }
  strong { color: #111; }
  a { color: #174e7a; text-decoration: none; }
  blockquote { margin: 8pt 0; padding: 0 0 0 10pt; border-left: 3px solid #7894aa; color: #374957; }
`;

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
try {
  for (const item of documents) {
    const sourcePath = path.join(root, item.source);
    const outputPath = path.join(root, item.output);
    const markdown = await fs.readFile(sourcePath, "utf8");
    const body = marked.parse(markdown);
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><title>${item.shortTitle}</title><style>${css}</style></head><body>${body}</body></html>`, { waitUntil: "load" });
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="width:100%;font:8px Arial;color:#5b6570;padding:0 17mm;text-align:right">Hospital Management System</div>`,
      footerTemplate: `<div style="width:100%;font:8px Arial;color:#5b6570;padding:0 17mm;display:flex;justify-content:space-between"><span>${item.shortTitle}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
      margin: { top: "20mm", right: "17mm", bottom: "20mm", left: "17mm" },
      outline: true,
      tagged: true,
    });
    await page.close();
    console.log(`Created ${path.relative(process.cwd(), outputPath)}`);
  }
} finally {
  await browser.close();
}
