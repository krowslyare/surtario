import { useEffect, useRef, useState } from "react";
import { FilePlus2, ListPlus, X } from "lucide-react";
import { Dialog } from "./Dialog";
import Select from "./ui/Select";
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
import SavedIngredientLists, {
  type SavedIngredientList,
} from "./SavedIngredientLists";
import type { Id } from "../../convex/_generated/dataModel";
import { batchFromSavedList } from "../intake/saved";

export default function IngredientIntake({
  onExplore,
  activeIngredient,
  persistenceEnabled,
}: {
  onExplore: (ingredient: string) => void;
  activeIngredient: string | null;
  persistenceEnabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [batch, setBatch] = useState<IntakeBatch | null>(null);
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const currentClientId = useRef(clientId);
  const [savedId, setSavedId] = useState<Id<"ingredientLists"> | null>(null);
  const [viewSource, setViewSource] = useState(false);
  return (
    <section className="ingredient-intake" aria-label="Ingredient intake">
      <div className="intake-actions">
        <button className="button secondary" onClick={() => setOpen(true)}>
          <FilePlus2 size={17} />
          {batch ? "Replace ingredient list" : "Add list or file"}
        </button>
        <span>Excel, CSV, photo/PDF, or manual entry</span>
      </div>
      {batch && (
        <div className="intake-batch">
          <div className="intake-batch-heading">
            <h2>{batch.rows.length} ingredients reviewed</h2>
            <button
              className="button text-button"
              onClick={() => setViewSource(true)}
            >
              View list source
            </button>
          </div>
          <p>
            Research one ingredient at a time in the selected area. Saving the
            list keeps only reviewed names; the file remains local.
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
      {persistenceEnabled && (
        <SavedIngredientLists
          batch={batch}
          clientId={clientId}
          savedId={savedId}
          onSaved={(id, submittedClientId) => {
            if (currentClientId.current !== submittedClientId) return false;
            setSavedId(id);
            return true;
          }}
          onOpen={(list: SavedIngredientList) => {
            setBatch(batchFromSavedList(list));
            const nextClientId = crypto.randomUUID();
            currentClientId.current = nextClientId;
            setClientId(nextClientId);
            setSavedId(list.id);
          }}
        />
      )}
      {open && (
        <IntakeDialog
          replacing={!!batch}
          onClose={() => setOpen(false)}
          onConfirm={(next) => {
            setBatch(next);
            const nextClientId = crypto.randomUUID();
            currentClientId.current = nextClientId;
            setClientId(nextClientId);
            setSavedId(null);
            setOpen(false);
          }}
        />
      )}
      {viewSource && batch && (
        <Dialog title="List source" wide onClose={() => setViewSource(false)}>
          <p>
            {batch.sourceLabel ?? batch.file?.name ?? "Manual entry"}
            {batch.sheet ? ` · ${batch.sheet}` : ""}
            {batch.column !== null
              ? ` · column ${batch.column + 1} · ${batch.hasHeader ? "with header" : "without header"}`
              : ""}
          </p>
          <p className="field-hint">
            {batch.method === "transcription"
              ? "Manual transcript; automatic extraction pending."
              : "Data reviewed by you. It does not record purchases or offers."}
          </p>
          {batch.file && <LocalSource file={batch.file} />}
          <div className="intake-source-rows">
            {batch.rows.map((row) => (
              <div key={row.id}>
                <strong>{row.ingredient}</strong>
                <p>
                  Row {row.line}: {row.original.join(" | ")}
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
        <img src={url} alt="Original document for transcription" />
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
            : "The file could not be read.",
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
      if (!next.length)
        throw new Error("There are no ingredients in this selection.");
      setRows(next);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Review the data.");
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
      setError(
        cause instanceof Error ? cause.message : "Review the ingredients.",
      );
    }
  }
  return (
    <Dialog title="Add ingredients" wide onClose={onClose}>
      <p className="field-hint">
        Use sample files. They are read in this browser and are not uploaded to the
        server. They are lost when you reload.
      </p>
      {replacing && (
        <p className="notice info">
          The current list will be replaced only after you confirm the new one.
        </p>
      )}
      {!rows ? (
        <>
          <label className="field intake-file">
            <span>Ingredient file (optional)</span>
            <span className="intake-file-button" aria-hidden="true">
              Choose file
            </span>
            <input
              aria-label="Ingredient file (optional)"
              type="file"
              accept=".xlsx,.csv,.png,.jpg,.jpeg,.webp,.pdf"
              onChange={(event) => {
                void load(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          <p className="field-hint">
            Up to 3 MB; XLSX/CSV with up to 100 ingredients, 20 columns, and 10 sheets.
            CSV en UTF-8. XLS antiguo no admitido.
          </p>
          {busy && <p role="status">Reading file in your browser…</p>}
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
                Remove file
              </button>
            </div>
          )}
          {sheet ? (
            <>
              <div className="form-grid intake-mapping">
                <label className="field">
                  <span>Sheet</span>
                  <Select
                    aria-label="Sheet"
                    value={String(sheetIndex)}
                    onValueChange={(value) => {
                      setSheetIndex(Number(value));
                      setColumn(-1);
                    }}
                    options={sheets.map((item, index) => ({
                      value: String(index),
                      label: item.name,
                    }))}
                  />
                </label>
                <label className="field">
                  <span>Ingredient column</span>
                  <Select
                    aria-label="Ingredient column"
                    value={String(column)}
                    onValueChange={(value) => setColumn(Number(value))}
                    options={[
                      { value: "-1", label: "Choose a column" },
                      ...Array.from(
                        {
                          length: Math.max(
                            0,
                            ...sheet.rows.map((row) => row.length),
                          ),
                        },
                        (_, index) => ({
                          value: String(index),
                          label: `Column ${index + 1}${
                            sheet.rows[0]?.[index]
                              ? `: ${sheet.rows[0][index].slice(0, 60)}`
                              : ""
                          }`,
                        }),
                      ),
                    ]}
                  />
                </label>
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={header}
                  onChange={(event) => setHeader(event.target.checked)}
                />
                The first row is a header
              </label>
              <div
                className="intake-table"
                tabIndex={0}
                aria-label="File preview"
              >
                <table>
                  <caption>
                    First 5 rows. Choose the column; we do not infer prices or
                    units.
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
                The selected sheet is imported. Other columns are kept as source
                context. Formulas are not recalculated; review their values.
              </p>
            </>
          ) : (
            !busy && (
              <>
                {document && (
                  <>
                    <p className="notice info">
                      AI extraction is not configured in this demo. You can transcribe
                      the ingredients and keep this file as the source.
                    </p>
                    <LocalSource file={file!} />
                  </>
                )}
                <label className="field intake-manual">
                  <span>
                    {document
                      ? "Transcribe ingredients, one per line"
                      : "Type or paste ingredients, one per line"}
                  </span>
                  <textarea
                    value={text}
                    maxLength={12500}
                    rows={5}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={"Rice\nVegetable oil\nRed onion"}
                  />
                </label>
              </>
            )
          )}
          <div className="dialog-actions">
            <button className="button secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="button primary"
              disabled={busy || (!!sheet && column < 0)}
              onClick={review}
            >
              <ListPlus size={17} />
              Review ingredients
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="intake-review-note">
            Correct the names or remove rows. You do not need price or quantity
            or a recipe to research.
          </p>
          <div className="intake-review">
            {rows.map((row, index) => (
              <div className="intake-review-row" key={row.id}>
                <label className="field">
                  <span>
                    Ingredient {index + 1} · row {row.line}
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
                  aria-label={`Remove ingredient ${index + 1}`}
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
              Back to input
            </button>
            <button className="button primary" onClick={confirm}>
              Confirm {rows.length}{" "}
              {rows.length === 1 ? "ingredient" : "ingredients"}
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
