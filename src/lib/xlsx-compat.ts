import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

const WORKSHEET_PATH = /^xl\/worksheets\/sheet\d+\.xml$/i;

function columnIndexFromReference(reference: string): number {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "";
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }
  return index;
}

function columnName(index: number): string {
  let value = index;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function addCellReferences(xml: string): { xml: string; changed: boolean } {
  let rowNumber = 0;
  let changed = false;

  const repaired = xml.replace(
    /<row\b([^>]*)>([\s\S]*?)<\/row>/gi,
    (rowXml, rowAttributes: string, cellsXml: string) => {
      const explicitRow = rowAttributes.match(/\br\s*=\s*["'](\d+)["']/i)?.[1];
      rowNumber = explicitRow ? Number(explicitRow) : rowNumber + 1;
      let columnIndex = 0;

      const repairedCells = cellsXml.replace(
        /<c\b([^>]*?)(\/?)>/gi,
        (cellXml, cellAttributes: string, selfClosing: string) => {
          const reference = cellAttributes.match(/\br\s*=\s*["']([^"']+)["']/i)?.[1];
          if (reference) {
            columnIndex = columnIndexFromReference(reference) || columnIndex + 1;
            return cellXml;
          }

          columnIndex += 1;
          changed = true;
          return `<c${cellAttributes} r="${columnName(columnIndex)}${rowNumber}"${selfClosing}>`;
        }
      );

      return `<row${rowAttributes}>${repairedCells}</row>`;
    }
  );

  return { xml: repaired, changed };
}

export function repairMissingXlsxCellReferences(buffer: Buffer): Buffer {
  const files = unzipSync(new Uint8Array(buffer));
  let changed = false;

  for (const [path, contents] of Object.entries(files)) {
    if (!WORKSHEET_PATH.test(path)) continue;
    const repaired = addCellReferences(strFromU8(contents));
    if (!repaired.changed) continue;
    files[path] = strToU8(repaired.xml);
    changed = true;
  }

  return changed ? Buffer.from(zipSync(files, { level: 6 })) : buffer;
}
