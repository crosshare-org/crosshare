const ctx: Worker = self as any;

console.log("LOADED WORKER");

const msgChannel = new MessageChannel();
let current: Autofiller;

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
    const solution = this.solution();
    if (solution) {
      console.log('Worker: Posting message back to main script');
      ctx.postMessage({input: this.grid, grid: solution});
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
  console.log("Worker: got message");
  const input = e.data.grid as Array<string>;
  current = new Autofiller(input);
  msgChannel.port1.postMessage('');
}
export default null as any;
