import { WordDBT } from './WordDB';
import { AutofillResultMessage, WorkerMessage, isLoadDBMessage, isAutofillMessage } from './types';

const ctx: Worker = self as any;

const msgChannel = new MessageChannel();
let current: Autofiller;
let db: WordDBT;

msgChannel.port2.onmessage = _e => {
  if (current.completed) {
    return;
  }
  current.step()
  msgChannel.port1.postMessage('');
}

const memo:Record<string, string[]> = {}
class Autofiller {
  public currentIter: number;
  public completed: boolean;
  public stringified: string;

  constructor(public readonly grid: string[]) {
    this.stringified = this.grid.join('|');
    this.currentIter = 0;
    this.completed = false;
  }
  solution() {
    if (this.currentIter === 0) {
      if (memo[this.stringified]) {
        return memo[this.stringified];
      }
    }
    if (this.currentIter === 20) {
      const solution = this.grid.map((cell) => cell.trim() !== "" ? cell : String.fromCharCode(65+Math.floor(Math.random() * 26)));
      memo[this.stringified] = solution;
      return solution;
    }
    return null;
  }
  step() {
    if (!db) {
      console.error("Worker has no db but attempting autofill");
      this.completed = true;
      return;
    }
    const solution = this.solution();
    if (solution) {
      let result: AutofillResultMessage = {input: this.grid, result: solution, type: 'autofill-result'};
      ctx.postMessage(result);
      this.completed = true;
      return;
    }

    var start = Date.now(),
    now = start;
    while (now - start < 100) {
      now = Date.now();
    }
    this.currentIter += 1;
  }
}

ctx.onmessage = (e) => {
  const data = e.data as WorkerMessage;
  if (isLoadDBMessage(data)) {
    db = data.db;
  } else if (isAutofillMessage(data)) {
    const input = data.grid;
    current = new Autofiller(input);
    msgChannel.port1.postMessage('');
  } else {
    console.error("unhandled msg in autofill worker: " + e.data);
  }
}
export default null as any;
