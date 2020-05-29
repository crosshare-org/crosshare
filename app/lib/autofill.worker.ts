import { AutofillResultMessage, AutofillCompleteMessage, WorkerMessage, isLoadDBMessage, isAutofillMessage } from './types';
import { Autofiller } from './Autofiller';
import { transformDb, setDb } from './WordDB';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx: Worker = self as any;

const msgChannel = new MessageChannel();
let current: Autofiller;

msgChannel.port2.onmessage = _e => {
  if (current.completed) {
    return;
  }
  current.step();
  msgChannel.port1.postMessage('');
};

function onResult(input: string[], result: string[]) {
  const soln: AutofillResultMessage = { input, result, type: 'autofill-result' };
  ctx.postMessage(soln);
}

function onComplete() {
  const soln: AutofillCompleteMessage = { type: 'autofill-complete' };
  ctx.postMessage(soln);
}

ctx.onmessage = (e) => {
  const data = e.data as WorkerMessage;
  if (isLoadDBMessage(data)) {
    setDb(transformDb(data.db));
  } else if (isAutofillMessage(data)) {
    current = new Autofiller(data.grid, data.width, data.height, onResult, onComplete);
    msgChannel.port1.postMessage('');
  } else {
    console.error('unhandled msg in autofill worker: ' + e.data);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default null as any;