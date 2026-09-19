import readXlsxFile from "read-excel-file/web-worker";
import { fileKind, normalizeSheet, parseCsv } from "./model";

self.onmessage = async (event: MessageEvent<File>) => {
  try {
    const file = event.data;
    const kind = fileKind(file);
    if (kind === "csv") {
      self.postMessage({ sheets: [parseCsv(await file.text())] });
    } else if (kind === "xlsx") {
      const workbook = await readXlsxFile(file, {
        trim: false,
        parseNumber: (value) => value,
      });
      if (workbook.length > 10)
        throw new Error("Use a file with up to 10 sheets.");
      self.postMessage({
        sheets: workbook.map((sheet) =>
          normalizeSheet(sheet.sheet, sheet.data),
        ),
      });
    } else
      throw new Error(
        "This document requires manual entry or AI extraction.",
      );
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "The file could not be read.",
    });
  }
};
