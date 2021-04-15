class AutofillWorker {
  postMessage() {
    return;
  }
}

export function getAutofillWorker() {
  return new AutofillWorker();
}
