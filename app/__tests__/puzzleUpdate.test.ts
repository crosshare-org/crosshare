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
