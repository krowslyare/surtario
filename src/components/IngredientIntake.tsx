import { useEffect, useRef, useState } from "react";
import { FilePlus2, ListPlus, X } from "lucide-react";
import { Dialog } from "./Dialog";
import {
  fileKind,
  manualRows,
  rowsFromColumn,
  validateRows,
  type InputSheet,
  type IntakeBatch,
  type IntakeRow,
} from "../intake/model";
import { readFile } from "../intake/readFile";

export default function IngredientIntake({
  onExplore,
  activeIngredient,
}: {
  onExplore: (ingredient: string) => void;
  activeIngredient: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [batch, setBatch] = useState<IntakeBatch | null>(null);
  const [viewSource, setViewSource] = useState(false);
  return (
    <section className="ingredient-intake" aria-label="Entrada de insumos">
      <div className="intake-actions">
        <button className="button secondary" onClick={() => setOpen(true)}>
          <FilePlus2 size={17} />
          {batch ? "Reemplazar lista de insumos" : "Añadir lista o archivo"}
        </button>
        <span>Excel, CSV, foto/PDF o escritura manual</span>
      </div>
      {batch && (
        <div className="intake-batch">
          <div className="intake-batch-heading">
            <h2>{batch.rows.length} insumos revisados</h2>
            <button
              className="button text-button"
              onClick={() => setViewSource(true)}
            >
              Ver origen de la lista
            </button>
          </div>
          <p>
            Investiga un insumo a la vez en la zona elegida. La lista y su
            archivo solo duran en esta pestaña; «Guardar estudio» no los guarda.
          </p>
          <div className="ingredient-queue">
            {batch.rows.map((row) => (
              <button
                className="button secondary"
                key={row.id}
                aria-pressed={activeIngredient === row.ingredient}
                onClick={() => {
                  onExplore(row.ingredient);
                }}
              >
                {row.ingredient}
              </button>
            ))}
          </div>
        </div>
      )}
      {open && (
        <IntakeDialog
          replacing={!!batch}
          onClose={() => setOpen(false)}
          onConfirm={(next) => {
            setBatch(next);
            setOpen(false);
          }}
        />
      )}
      {viewSource && batch && (
        <Dialog
          title="Origen de la lista"
          wide
          onClose={() => setViewSource(false)}
        >
          <p>
            {batch.file?.name ?? "Entrada manual"}
            {batch.sheet ? ` · ${batch.sheet}` : ""}
            {batch.column !== null
              ? ` · columna ${batch.column + 1} · ${batch.hasHeader ? "con encabezado" : "sin encabezado"}`
              : ""}
          </p>
          <p className="field-hint">
            {batch.method === "transcription"
              ? "Transcripción manual; extracción automática pendiente."
              : "Datos revisados por ti. No registran compras ni ofertas."}
          </p>
          {batch.file && <LocalSource file={batch.file} />}
          <div className="intake-source-rows">
            {batch.rows.map((row) => (
              <div key={row.id}>
                <strong>{row.ingredient}</strong>
                <p>
                  Fila {row.line}: {row.original.join(" | ")}
                </p>
              </div>
            ))}
          </div>
        </Dialog>
      )}
    </section>
  );
}
function LocalSource({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const value = URL.createObjectURL(file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);
  const image = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
  return (
    <div className="local-source">
      {image && url && (
        <img src={url} alt="Documento original para transcripción" />
      )}
      <a href={url || undefined} download={file.name}>
        Descargar original local
      </a>
    </div>
  );
}
function IntakeDialog({
  replacing,
  onClose,
  onConfirm,
}: {
  replacing: boolean;
  onClose: () => void;
  onConfirm: (batch: IntakeBatch) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<InputSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [column, setColumn] = useState(-1);
  const [header, setHeader] = useState(true);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<IntakeRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const sheet = sheets[sheetIndex];
  const document = !!file && !sheets.length && !busy;
  async function load(next: File | undefined) {
    if (!next) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setError("");
    setRows(null);
    setSheets([]);
    setFile(null);
    setColumn(-1);
    setSheetIndex(0);
    setText("");
    try {
      const kind = fileKind(next);
      setBusy(true);
      const loaded =
        kind === "document" ? [] : await readFile(next, current.signal);
      if (current.signal.aborted) return;
      setFile(next);
      setSheets(loaded);
    } catch (cause) {
      if (!current.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo leer el archivo.",
        );
    } finally {
      if (!current.signal.aborted) setBusy(false);
    }
  }
  function review() {
    try {
      const next = sheet
        ? rowsFromColumn(sheet, column, header)
        : manualRows(text);
      if (!next.length) throw new Error("No hay insumos en esta selección.");
      setRows(next);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Revisa los datos.");
    }
  }
  function confirm() {
    try {
      validateRows(rows ?? []);
      onConfirm({
        file,
        sheet: sheet?.name ?? "",
        column: sheet ? column : null,
        hasHeader: !!sheet && header,
        method: sheet ? "spreadsheet" : file ? "transcription" : "manual",
        rows: rows!.map((row) => ({
          ...row,
          ingredient: row.ingredient.trim(),
        })),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Revisa los insumos.");
    }
  }
  return (
    <Dialog title="Añadir insumos" wide onClose={onClose}>
      <p className="field-hint">
        Trabaja con archivos de ejemplo. Se leen en este navegador y no se suben
        al servidor. Se pierden al recargar.
      </p>
      {replacing && (
        <p className="notice info">
          La lista actual se reemplazará solo cuando confirmes la nueva.
        </p>
      )}
      {!rows ? (
        <>
          <label className="field intake-file">
            <span>Archivo de insumos (opcional)</span>
            <span className="intake-file-button" aria-hidden="true">
              Elegir archivo
            </span>
            <input
              aria-label="Archivo de insumos (opcional)"
              type="file"
              accept=".xlsx,.csv,.png,.jpg,.jpeg,.webp,.pdf"
              onChange={(event) => {
                void load(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          <p className="field-hint">
            Hasta 3 MB; XLSX/CSV de hasta 100 insumos, 20 columnas y 10 hojas.
            CSV en UTF-8. XLS antiguo no admitido.
          </p>
          {busy && <p role="status">Leyendo archivo en tu navegador…</p>}
          {file && (
            <div className="intake-file-summary">
              <strong>{file.name}</strong>
              <button
                className="button text-button"
                onClick={() => {
                  setFile(null);
                  setSheets([]);
                  setText("");
                  setColumn(-1);
                  setError("");
                }}
              >
                Quitar archivo
              </button>
            </div>
          )}
          {sheet ? (
            <>
              <div className="form-grid intake-mapping">
                <label className="field">
                  <span>Hoja</span>
                  <select
                    aria-label="Hoja"
                    value={sheetIndex}
                    onChange={(event) => {
                      setSheetIndex(Number(event.target.value));
                      setColumn(-1);
                    }}
                  >
                    {sheets.map((item, index) => (
                      <option key={index} value={index}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Columna de insumos</span>
                  <select
                    value={column}
                    onChange={(event) => setColumn(Number(event.target.value))}
                  >
                    <option value={-1}>Elige una columna</option>
                    {Array.from(
                      {
                        length: Math.max(
                          0,
                          ...sheet.rows.map((row) => row.length),
                        ),
                      },
                      (_, index) => (
                        <option key={index} value={index}>
                          Columna {index + 1}
                          {sheet.rows[0]?.[index]
                            ? `: ${sheet.rows[0][index].slice(0, 60)}`
                            : ""}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={header}
                  onChange={(event) => setHeader(event.target.checked)}
                />
                La primera fila es un encabezado
              </label>
              <div
                className="intake-table"
                tabIndex={0}
                aria-label="Vista previa del archivo"
              >
                <table>
                  <caption>
                    Primeras 5 filas. Elige la columna; no inferimos precios ni
                    unidades.
                  </caption>
                  <tbody>
                    {sheet.rows.slice(0, 5).map((row, index) => (
                      <tr key={index}>
                        <th scope="row">{index + 1}</th>
                        {row.map((cell, index) => (
                          <td key={index}>{cell || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="field-hint">
                Se importa la hoja elegida. Otras columnas se conservan como
                contexto de origen. Las fórmulas no se recalculan: revisa sus
                valores.
              </p>
            </>
          ) : (
            !busy && (
              <>
                {document && (
                  <>
                    <p className="notice info">
                      Extracción automática pendiente de conectar OpenAI. Puedes
                      transcribir los insumos y conservar este archivo como
                      origen.
                    </p>
                    <LocalSource file={file!} />
                  </>
                )}
                <label className="field intake-manual">
                  <span>
                    {document
                      ? "Transcribe los insumos, uno por línea"
                      : "Escribe o pega insumos, uno por línea"}
                  </span>
                  <textarea
                    value={text}
                    maxLength={12500}
                    rows={5}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={"Arroz\nAceite vegetal\nCebolla roja"}
                  />
                </label>
              </>
            )
          )}
          <div className="dialog-actions">
            <button className="button secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={busy || (!!sheet && column < 0)}
              onClick={review}
            >
              <ListPlus size={17} />
              Revisar insumos
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="intake-review-note">
            Corrige los nombres o elimina filas. No necesitas precio, cantidad
            ni receta para investigar.
          </p>
          <div className="intake-review">
            {rows.map((row, index) => (
              <div className="intake-review-row" key={row.id}>
                <label className="field">
                  <span>
                    Insumo {index + 1} · fila {row.line}
                  </span>
                  <input
                    maxLength={120}
                    value={row.ingredient}
                    onChange={(event) =>
                      setRows(
                        rows.map((item) =>
                          item.id === row.id
                            ? { ...item, ingredient: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  className="icon-button"
                  aria-label={`Eliminar insumo ${index + 1}`}
                  onClick={() =>
                    setRows(rows.filter((item) => item.id !== row.id))
                  }
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
          <div className="dialog-actions">
            <button className="button secondary" onClick={() => setRows(null)}>
              Volver a la entrada
            </button>
            <button className="button primary" onClick={confirm}>
              Confirmar {rows.length} insumos
            </button>
          </div>
        </>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
