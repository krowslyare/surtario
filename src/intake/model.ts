import Papa from "papaparse";

export const MAX_FILE_BYTES = 3 * 1024 * 1024;
export const MAX_ROWS = 100;
export type InputSheet = { name: string; rows: string[][] };
export type IntakeRow = {
  id: string;
  ingredient: string;
  original: string[];
  line: number;
};
export type IntakeBatch = {
  rows: IntakeRow[];
  file: File | null;
  sheet: string;
  column: number | null;
  hasHeader: boolean;
  method: "manual" | "spreadsheet" | "transcription";
  sourceLabel?: string;
};
export function fileKind(file: Pick<File, "name" | "size">) {
  if (!file.size) throw new Error("The file is empty.");
  if (file.size > MAX_FILE_BYTES)
    throw new Error("Use a file up to 3 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "xlsx" || extension === "csv") return extension;
  if (["png", "jpg", "jpeg", "webp", "pdf"].includes(extension ?? ""))
    return "document";
  throw new Error(
    "Unsupported format. Use XLSX, CSV, PNG, JPG, WebP or PDF. For XLS, save a copy as XLSX.",
  );
}
export function normalizeSheet(name: string, input: unknown[][]): InputSheet {
  if (input.length > MAX_ROWS + 1)
    throw new Error(
      "Use up to 100 data rows per sheet, plus the header.",
    );
  if (input.some((row) => row.length > 20))
    throw new Error("Use up to 20 columns per sheet.");
  const rows = input.map((row) =>
    row.map((cell) => {
      const value =
        cell instanceof Date
          ? cell.toISOString()
          : cell == null
            ? ""
            : String(cell);
      if (value.length > 2000)
        throw new Error(
          "A cell exceeds 2000 characters. Shorten its content.",
        );
      return value;
    }),
  );
  return { name, rows };
}
export function parseCsv(text: string): InputSheet {
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    dynamicTyping: false,
    skipEmptyLines: false,
  });
  // A one-column ingredient list needs no delimiter. All syntax errors remain fatal.
  if (parsed.errors.some((error) => error.code !== "UndetectableDelimiter"))
    throw new Error(
      "The CSV could not be read. Check quotes and separators or export it again as UTF-8.",
    );
  const rows = parsed.data;
  while (rows.length && rows.at(-1)?.every((cell) => !cell.trim())) rows.pop();
  return normalizeSheet("CSV", rows);
}
export function rowsFromColumn(
  sheet: InputSheet,
  column: number,
  header: boolean,
): IntakeRow[] {
  if (!Number.isInteger(column) || column < 0 || column >= 20)
    throw new Error("Choose the ingredient column.");
  const rows = sheet.rows.flatMap((original, index) => {
    if (header && index === 0) return [];
    if (original.every((cell) => !cell.trim())) return [];
    return [
      {
        id: String(index),
        ingredient: original[column]?.trim() ?? "",
        original: [...original],
        line: index + 1,
      },
    ];
  });
  if (rows.length > MAX_ROWS)
    throw new Error("Use up to 100 ingredients per list.");
  return rows;
}
export function manualRows(text: string): IntakeRow[] {
  return rowsFromColumn(
    normalizeSheet(
      "Manual",
      text.split(/\r?\n/).map((line) => [line]),
    ),
    0,
    false,
  );
}
export function validateRows(rows: IntakeRow[]) {
  if (!rows.length) throw new Error("Add at least one ingredient.");
  if (rows.length > MAX_ROWS)
    throw new Error("Use up to 100 ingredients per list.");
  if (
    rows.some(
      (row) => !row.ingredient.trim() || row.ingredient.trim().length > 120,
    )
  )
    throw new Error(
      "Each ingredient must be between 1 and 120 characters. Complete or remove empty rows.",
    );
}
