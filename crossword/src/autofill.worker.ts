const ctx: Worker = self as any;

console.log("LOADED WORKER");

ctx.onmessage = (e) => {
  console.log("here");
  const input = e.data.grid as Array<string>;
  const grid = input.map((cell) => cell.trim() !== "" ? cell : String.fromCharCode(65+Math.floor(Math.random() * 26)));

  console.log('Worker: Posting message back to main script');
  ctx.postMessage({input, grid});
}
export default null as any;
