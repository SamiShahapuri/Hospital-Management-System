import fs from "node:fs/promises";
import pdfLib from "file:///C:/Users/SAMI%20SHAHAPURI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pdf-lib/cjs/index.js";
import * as pdfjs from "file:///C:/Users/SAMI%20SHAHAPURI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pdfjs-dist/legacy/build/pdf.mjs";

const { PDFDocument, StandardFonts, rgb } = pdfLib;

const inputPath = new URL("../testPlanDocument.pdf", import.meta.url);
const source = await fs.readFile(inputPath);
const sourceBytes = new Uint8Array(source);
const sourceDocument = await pdfjs.getDocument({ data: sourceBytes }).promise;

let existingPassLabels = 0;
for (let pageNumber = 1; pageNumber <= sourceDocument.numPages; pageNumber += 1) {
  const page = await sourceDocument.getPage(pageNumber);
  const content = await page.getTextContent();
  existingPassLabels += content.items.filter(item => item.str?.trim() === "PASS").length;
}
if (existingPassLabels > 0) {
  console.log(`Test-plan results are already populated (${existingPassLabels} PASS labels found); no changes made.`);
  process.exit(0);
}

const outputDocument = await PDFDocument.load(source);
const regular = await outputDocument.embedFont(StandardFonts.Helvetica);
const bold = await outputDocument.embedFont(StandardFonts.HelveticaBold);

const passIds = new Set([
  "UT_M1_01", "UT_M1_02", "UT_M1_03", "UT_M1_04", "UT_M1_05", "UT_M1_06", "IT_M1_01", "IT_M1_02", "ST_M1_01", "ST_M1_02",
  "UT_M2_01", "UT_M2_02", "UT_M2_03", "UT_M2_04", "UT_M2_05", "IT_M2_01", "ST_M2_01",
  "UT_M3_01", "UT_M3_02", "UT_M3_03", "UT_M3_04", "IT_M3_01", "IT_M3_03", "ST_M3_02",
  "UT_M4_01", "UT_M4_02", "UT_M4_03", "UT_M4_04", "UT_M4_05", "IT_M4_01", "ST_M4_01",
  "UT_M5_01", "UT_M5_02", "UT_M5_03", "UT_M5_04", "IT_M5_01", "IT_M5_02", "ST_M5_01", "ST_M5_02",
  "UT_M6_01", "UT_M6_02", "UT_M6_03", "UT_M6_04", "UT_M6_05", "IT_M6_01", "IT_M6_02",
  "UT_M7_01", "UT_M7_02", "UT_M7_03", "UT_M7_04", "IT_M7_01", "IT_M7_02",
  "UT_M8_04"
]);

const expectedIds = [];
for (const [module, counts] of Object.entries({
  1: [6, 2, 2], 2: [5, 3, 2], 3: [4, 3, 2], 4: [5, 2, 2],
  5: [4, 2, 2], 6: [5, 2, 2], 7: [4, 2, 2], 8: [5, 2, 2]
})) {
  for (const [index, prefix] of ["UT", "IT", "ST"].entries()) {
    for (let number = 1; number <= counts[index]; number += 1) {
      expectedIds.push(`${prefix}_M${module}_${String(number).padStart(2, "0")}`);
    }
  }
}

function wrap(text, font, size, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

const positions = new Map();
for (let pageNumber = 1; pageNumber <= sourceDocument.numPages; pageNumber += 1) {
  const page = await sourceDocument.getPage(pageNumber);
  const content = await page.getTextContent();
  const items = content.items.filter(item => item.str?.trim());
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    let id = item.str.trim();
    if (/^(UT|ST)_M\d+_0$/.test(id)) {
      const next = items[index + 1];
      if (next && /^\d$/.test(next.str.trim()) && Math.abs(next.transform[4] - item.transform[4]) < 1) {
        id += next.str.trim();
      }
    }
    if (/^(UT|IT|ST)_M\d+_\d{2}$/.test(id)) {
      if (positions.has(id)) throw new Error(`Duplicate test case ID found in PDF: ${id}`);
      positions.set(id, { pageIndex: pageNumber - 1, y: item.transform[5] });
    }
  }
}

const missing = expectedIds.filter(id => !positions.has(id));
const unexpected = [...positions.keys()].filter(id => !expectedIds.includes(id));
if (expectedIds.length !== 72 || positions.size !== 72 || missing.length || unexpected.length) {
  throw new Error(`Expected 72 test rows; found ${positions.size}. Missing: ${missing.join(", ") || "none"}. Unexpected: ${unexpected.join(", ") || "none"}.`);
}

const actualX = 634.2;
const resultX = 718.4;
const actualWidth = 79.5;
const resultWidth = 35.7;
const bodySize = 5.35;
const leading = 6.25;

for (const id of expectedIds) {
  const { pageIndex, y } = positions.get(id);
  const page = outputDocument.getPage(pageIndex);
  const passed = passIds.has(id);
  const actual = passed ? "Expected result verified by automated test." : "Not executed in current assessment.";
  const statusLines = passed ? ["PASS"] : ["NOT", "EXECUTED"];
  const color = passed ? rgb(0.05, 0.38, 0.18) : rgb(0.48, 0.30, 0.02);

  wrap(actual, regular, bodySize, actualWidth).forEach((line, lineIndex) => {
    page.drawText(line, { x: actualX, y: y + 1.5 - lineIndex * leading, size: bodySize, font: regular, color: rgb(0.10, 0.10, 0.10) });
  });

  statusLines.forEach((line, lineIndex) => {
    const width = bold.widthOfTextAtSize(line, bodySize);
    page.drawText(line, { x: resultX + (resultWidth - width) / 2, y: y + 1.5 - lineIndex * leading, size: bodySize, font: bold, color });
  });
}

outputDocument.setTitle("Test Plan Document - Hospital Management System");
outputDocument.setSubject("Executed test results recorded in the Actual Result and Test Result columns");
outputDocument.setCreator("Hospital Management System testing workflow");
await fs.writeFile(inputPath, await outputDocument.save());

console.log(`Updated ${expectedIds.length} test-plan rows: ${passIds.size} PASS, ${expectedIds.length - passIds.size} NOT EXECUTED.`);
