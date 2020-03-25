import { WordDB } from './WordDB';

const ctx: Worker = self as any;

ctx.addEventListener('message', (e) => { // eslint-disable-line no-unused-vars
  console.log('Worker: Message received from main script, ' + (e.data.db as WordDB).words[5]?.length);
  const input = e.data.grid as Array<string>;
  const grid = input.map((cell) => cell.trim() !== "" ? cell : String.fromCharCode(65+Math.floor(Math.random() * 26)));

  console.log('Worker: Posting message back to main script');
  ctx.postMessage({input, grid});
});
