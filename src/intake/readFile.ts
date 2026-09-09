import type { InputSheet } from "./model";

export function readFile(
  file: File,
  signal: AbortSignal,
): Promise<InputSheet[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./parse.worker.ts", import.meta.url), {
      type: "module",
    });
    const finish = (error?: Error, sheets?: InputSheet[]) => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      worker.terminate();
      if (error) reject(error);
      else resolve(sheets ?? []);
    };
    const abort = () => finish(new Error("Lectura cancelada."));
    const timeout = setTimeout(
      () =>
        finish(
          new Error(
            "La lectura tardó demasiado. Usa una copia más pequeña del archivo.",
          ),
        ),
      10000,
    );
    worker.onmessage = (event) => {
      const result = event.data as { error?: string; sheets?: InputSheet[] };
      finish(
        result.error
          ? new Error(`No se pudo importar: ${result.error}`)
          : undefined,
        result.sheets,
      );
    };
    worker.onerror = () =>
      finish(
        new Error(
          "No se pudo leer el archivo. Comprueba el formato e inténtalo de nuevo.",
        ),
      );
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    else worker.postMessage(file);
  });
}
