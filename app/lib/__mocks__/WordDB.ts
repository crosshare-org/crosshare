export { };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WordDB = jest.genMockFromModule('../WordDB') as any;

WordDB.initializeOrBuild = (callback: (success: boolean) => void) => {
  callback(true);
};

WordDB.dbEncoded = true;

WordDB.matchingWords = () => [];

module.exports = WordDB;
