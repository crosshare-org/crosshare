/* eslint-disable @typescript-eslint/no-unsafe-member-access */
export {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
const WordDB: any = jest.createMockFromModule('../WordDB');

WordDB.useWordDB = () => {
  return [
    true,
    '',
    false,
    () => {
      /*empty*/
    },
  ];
};

WordDB.wordDB = true;

WordDB.matchingWords = () => [];

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
module.exports = WordDB;
