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
    const abort = () => finish(new Error("Reading canceled."));
    const timeout = setTimeout(
      () =>
        finish(
          new Error(
            "Reading took too long. Use a smaller copy of the file.",
          ),
        ),
      10000,
    );
    worker.onmessage = (event) => {
      const result = event.data as { error?: string; sheets?: InputSheet[] };
      finish(
        result.error
          ? new Error(`Import failed: ${result.error}`)
          : undefined,
        result.sheets,
      );
    };
    worker.onerror = () =>
      finish(
        new Error(
          "The file could not be read. Check its format and try again.",
        ),
      );
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    else worker.postMessage(file);
  });
}
