import * as WordDB from './WordDB';

const ctx: Worker = self as any;

ctx.addEventListener('message', (e) => { // eslint-disable-line no-unused-vars
  console.log("here");
  console.log('Worker: Message received from main script, ' + WordDB.dbStatus);
  const input = e.data.grid as Array<string>;
  const grid = input.map((cell) => cell.trim() !== "" ? cell : String.fromCharCode(65+Math.floor(Math.random() * 26)));

  console.log('Worker: Posting message back to main script');
  ctx.postMessage({input, grid});
});
export default null as any;
