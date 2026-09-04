/**
 * @jest-environment node
 */

import {
  RulesTestEnvironment,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { CommentWithRepliesT, DBPuzzleT } from '../lib/dbtypes.js';
import {
  overrideFirestore,
  overrideToFirestore,
} from '../lib/firebaseAdminWrapper.js';
import { convertTimestamps, converter } from '../lib/firebaseWrapper.js';
import { getMockedPuzzle } from '../lib/getMockedPuzzle.js';
import { newPuzzleNotification } from '../lib/notificationTypes.js';
import { handlePuzzleUpdate } from '../lib/puzzleUpdate.js';
import { Timestamp } from '../lib/timestamp.js';

const toDeleteId = 'puzzletodelete';
const toKeepId = 'puzzletokeep';
const baseTime = new Date(Date.UTC(2020, 10, 10));
const baseTime2 = new Date(Date.UTC(2020, 11, 11));
const basePuzzle = getMockedPuzzle({
  cs: undefined,
  f: true,
  p: Timestamp.fromDate(baseTime),
  pvu: Timestamp.fromDate(baseTime),
});
