export const parse = async (cluedata: Buffer): Promise<void> => {
  let offset = 0;
  const readInt = () => {
    const v = cluedata.readInt32LE(offset);
    offset += 4;
    return v;
  };
  const readByte = () => {
    const v = cluedata.readUInt8(offset);
    offset += 1;
    return v;
  };
  const readString = (strLen: number) => {
    const v = cluedata.toString('latin1', offset, offset + strLen);
    offset += strLen;
    return v;
  };
  const readLenStr = () => {
    const len = readByte();
    return readString(len);
  };

  const numWords = readInt();
  console.log(`${numWords} words`);
  const words: Array<string> = [];
  for (let i = 0; i < numWords; i += 1) {
    words.push(readLenStr());
  }
  console.log('beginning and end', words[0], words[words.length - 1]);

  const clues: Array<string> = [];
  const clueClues: Array<Array<number>> = [];
  const numClues = readInt();
  console.log(`${numClues} clues`);
  for (let i = 0; i < numClues; i += 1) {
    clues.push(readLenStr());
    const numTraps = readInt();
    const traps: Array<number> = [];
    for (let j = 0; j < numTraps; j += 1) {
      traps.push(readInt());
    }
    clueClues.push(traps);
  }
  console.log('beginning and end', clues[0], clues[clues.length - 1]);

  
};