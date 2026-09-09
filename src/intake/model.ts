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
  if (!file.size) throw new Error("El archivo está vacío.");
  if (file.size > MAX_FILE_BYTES)
    throw new Error("Usa un archivo de hasta 3 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "xlsx" || extension === "csv") return extension;
  if (["png", "jpg", "jpeg", "webp", "pdf"].includes(extension ?? ""))
    return "document";
  throw new Error(
    "Formato no admitido. Usa XLSX, CSV, PNG, JPG, WebP o PDF. Para XLS, guarda una copia como XLSX.",
  );
}
export function normalizeSheet(name: string, input: unknown[][]): InputSheet {
  if (input.length > MAX_ROWS + 1)
    throw new Error(
      "Usa hasta 100 filas de datos por hoja, más el encabezado.",
    );
  if (input.some((row) => row.length > 20))
    throw new Error("Usa hasta 20 columnas por hoja.");
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
          "Una celda supera los 2000 caracteres. Reduce su contenido.",
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
      "No se pudo leer el CSV. Revisa comillas y separadores o expórtalo de nuevo en UTF-8.",
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
    throw new Error("Elige la columna de insumos.");
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
    throw new Error("Usa hasta 100 insumos por lista.");
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
  if (!rows.length) throw new Error("Añade al menos un insumo.");
  if (rows.length > MAX_ROWS)
    throw new Error("Usa hasta 100 insumos por lista.");
  if (
    rows.some(
      (row) => !row.ingredient.trim() || row.ingredient.trim().length > 120,
    )
  )
    throw new Error(
      "Cada insumo debe tener entre 1 y 120 caracteres. Completa o elimina las filas vacías.",
    );
}
