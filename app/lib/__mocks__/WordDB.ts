export { };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WordDB = jest.genMockFromModule('../WordDB') as any;

WordDB.initialize = (): Promise<boolean> => {
  return Promise.resolve(true);
};

WordDB.wordDB = true;

WordDB.matchingWords = () => [];

module.exports = WordDB;
