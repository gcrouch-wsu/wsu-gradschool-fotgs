import assert from "node:assert/strict";
import test from "node:test";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { repairMissingXlsxCellReferences } from "./xlsx-compat.ts";

const SHEET_PATH = "xl/worksheets/sheet1.xml";

function workbookWithSheet(xml: string): Buffer {
  return Buffer.from(zipSync({ [SHEET_PATH]: strToU8(xml) }));
}

function sheetXml(buffer: Buffer): string {
  return strFromU8(unzipSync(new Uint8Array(buffer))[SHEET_PATH]);
}

test("adds sequential references to addressless OBIEE cells", () => {
  const input = workbookWithSheet(
    '<worksheet><sheetData><row><c t="inlineStr"><is><t>Header</t></is></c><c><v>2</v></c></row><row><c><v>3</v></c></row></sheetData></worksheet>'
  );

  const repaired = sheetXml(repairMissingXlsxCellReferences(input));

  assert.match(repaired, /<c t="inlineStr" r="A1">/);
  assert.match(repaired, /<c r="B1"><v>2<\/v><\/c>/);
  assert.match(repaired, /<c r="A2"><v>3<\/v><\/c>/);
});

test("continues after explicit row and cell references", () => {
  const input = workbookWithSheet(
    '<worksheet><sheetData><row r="4"><c r="B4"><v>1</v></c><c><v>2</v></c></row></sheetData></worksheet>'
  );

  const repaired = sheetXml(repairMissingXlsxCellReferences(input));

  assert.match(repaired, /<c r="B4"><v>1<\/v><\/c><c r="C4"><v>2<\/v><\/c>/);
});

test("preserves self-closing empty cells", () => {
  const input = workbookWithSheet(
    '<worksheet><sheetData><row><c/><c t="inlineStr"/></row></sheetData></worksheet>'
  );

  const repaired = sheetXml(repairMissingXlsxCellReferences(input));

  assert.match(repaired, /<c r="A1"\/><c t="inlineStr" r="B1"\/>/);
});

test("leaves a standard addressed workbook unchanged", () => {
  const input = workbookWithSheet(
    '<worksheet><sheetData><row r="1"><c r="A1"><v>1</v></c></row></sheetData></worksheet>'
  );

  assert.equal(repairMissingXlsxCellReferences(input), input);
});
