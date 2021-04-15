export function getAutofillWorker() {
  return new Worker(new URL('./autofill.worker.ts', import.meta.url));
}
