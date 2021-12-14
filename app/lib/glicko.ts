import {
  CronStatusT,
  CronStatusV,
  DBPuzzleV,
  GlickoScoreT,
  LegacyPlayT,
  LegacyPlayV,
} from './dbtypes';
import admin from 'firebase-admin';
import { AccountPrefsV } from './prefs';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import {
  gFunc,
  expectedOutcome,
  Q,
  Q_SQ,
  INITIAL_RATING,
  INITIAL_RD,
} from './glickoUtil';
import { notEmpty } from './utils';

const MAX_RD = 350;
const PLAYER_MIN_RD = 30;
const PUZZLE_MIN_RD = 10;
const PUZZLE_C_SQ = 2.7;
const PLAYER_C_SQ = 13.7;

export enum Result {
  Win = 1,
  Loss = 0,
  Tie = 0.5,
}

type CrosswordId = string;
type PlayerId = string;

export class GlickoRound {
  PLAYER_MIN_RD: number;
  PUZZLE_MIN_RD: number;
  PLAYER_C_SQ: number;
  PUZZLE_C_SQ: number;

  currentRound: number;
  playerBeforeScores: Map<PlayerId, GlickoScoreT>;
  puzzleBeforeScores: Map<CrosswordId, GlickoScoreT>;
  playerMatches: Map<PlayerId, Array<[CrosswordId, Result]>>;
  puzzleMatches: Map<CrosswordId, Array<[PlayerId, Result]>>;

  loadPlayerScore: (playerId: string) => Promise<GlickoScoreT | undefined> =
    async () => undefined;
  loadPuzzleScore: (puzzleId: string) => Promise<GlickoScoreT | undefined> =
    async () => undefined;
  savePlayerScore: (
    playerId: string,
    score: GlickoScoreT
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ) => Promise<void> = async () => {};
  savePuzzleScore: (
    puzzleId: string,
    score: GlickoScoreT
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ) => Promise<void> = async () => {};

  constructor(
    roundNumber: number,
    playerMinRD: number,
    puzzleMinRD: number,
    playerCSq: number,
    puzzleCSq: number
  ) {
    this.currentRound = roundNumber;
    this.playerBeforeScores = new Map();
    this.puzzleBeforeScores = new Map();
    this.playerMatches = new Map();
    this.puzzleMatches = new Map();
    this.PLAYER_MIN_RD = playerMinRD;
    this.PUZZLE_MIN_RD = puzzleMinRD;
    this.PLAYER_C_SQ = playerCSq;
    this.PUZZLE_C_SQ = puzzleCSq;
  }

  addMatchToRound(playerId: string, puzzleId: string, result: Result) {
    const playerResult = result;
    const puzzleResult =
      result === Result.Win
        ? Result.Loss
        : result === Result.Loss
          ? Result.Win
          : Result.Tie;

    let matchesForPlayer = this.playerMatches.get(playerId);
    if (!matchesForPlayer) {
      matchesForPlayer = [];
      this.playerMatches.set(playerId, matchesForPlayer);
    }
    matchesForPlayer.push([puzzleId, playerResult]);
    let matchesForPuzzle = this.puzzleMatches.get(puzzleId);
    if (!matchesForPuzzle) {
      matchesForPuzzle = [];
      this.puzzleMatches.set(puzzleId, matchesForPuzzle);
    }
    matchesForPuzzle.push([playerId, puzzleResult]);
  }

  computeNewScore(
    prevScore: GlickoScoreT,
    matches: Array<GlickoScoreT & { s: Result }>,
    minRD: number
  ): GlickoScoreT {
    const withCalcs = matches.map((match) => {
      const g = gFunc(match.d);
      const e = expectedOutcome(g, prevScore.r, match.r);
      return { ...match, g, e };
    });
    const d_sq =
      1 /
      (Q_SQ *
        withCalcs.reduce((total: number, opp): number => {
          return total + opp.g * opp.g * opp.e * (1 - opp.e);
        }, 0));
    const rd_sq = prevScore.d * prevScore.d;
    const newRating =
      prevScore.r +
      (Q / (1 / rd_sq + 1 / d_sq)) *
        withCalcs.reduce((total: number, opp): number => {
          return total + opp.g * (opp.s - opp.e);
        }, 0);
    const newRD = Math.sqrt(1 / (1 / rd_sq + 1 / d_sq));
    return {
      r: newRating,
      d: Math.max(Math.min(newRD, MAX_RD), minRD),
      u: this.currentRound,
    };
  }

  async computeAndUpdate() {
    for (const [userId, playerMatches] of this.playerMatches.entries()) {
      const userScore = await this.scoreForPlayer(userId);
      const matches = (
        await Promise.all(
          playerMatches.map(async ([puzzleId, result]) => {
            try {
              const puzScore = await this.scoreForPuzzle(puzzleId);
              return { ...puzScore, s: result };
            } catch {
              return null;
            }
          })
        )
      ).filter(notEmpty);
      const newScore = this.computeNewScore(
        userScore,
        matches,
        this.PLAYER_MIN_RD
      );
      await this.savePlayerScore(userId, newScore);
    }
    for (const [puzzleId, puzzleMatches] of this.puzzleMatches.entries()) {
      try {
        const puzScore = await this.scoreForPuzzle(puzzleId);
        const matches = await Promise.all(
          puzzleMatches.map(async ([playerId, result]) => {
            const playerScore = await this.scoreForPlayer(playerId);
            return { ...playerScore, s: result };
          })
        );
        const newScore = this.computeNewScore(
          puzScore,
          matches,
          this.PUZZLE_MIN_RD
        );
        await this.savePuzzleScore(puzzleId, newScore);
      } catch {
        continue;
      }
    }
  }

  initialScore(): GlickoScoreT {
    return { r: INITIAL_RATING, d: INITIAL_RD, u: this.currentRound };
  }

  initializeRatingForRound(
    previous: GlickoScoreT,
    c_squared: number,
    minRD: number
  ): GlickoScoreT {
    const timePeriods = this.currentRound - previous.u;
    const newDeviation = Math.sqrt(
      previous.d * previous.d + timePeriods * c_squared
    );
    return {
      r: previous.r,
      d: Math.max(Math.min(newDeviation, MAX_RD), minRD),
      u: this.currentRound,
    };
  }

  async scoreForPlayer(userId: string): Promise<GlickoScoreT> {
    const cached = this.playerBeforeScores.get(userId);
    if (cached) {
      return cached;
    }
    const rtg = await this.loadPlayerScore(userId);
    const newScore = this.initializeRatingForRound(
      rtg || this.initialScore(),
      this.PLAYER_C_SQ,
      this.PLAYER_MIN_RD
    );
    this.puzzleBeforeScores.set(userId, newScore);
    return newScore;
  }

  async scoreForPuzzle(puzzleId: string): Promise<GlickoScoreT> {
    const cached = this.puzzleBeforeScores.get(puzzleId);
    if (cached) {
      return cached;
    }
    const rtg = await this.loadPuzzleScore(puzzleId);
    const newScore = this.initializeRatingForRound(
      rtg || this.initialScore(),
      this.PUZZLE_C_SQ,
      this.PUZZLE_MIN_RD
    );
    this.puzzleBeforeScores.set(puzzleId, newScore);
    return newScore;
  }
}

const PLAYER_SCORE_CACHE: Map<string, GlickoScoreT> = new Map();
const PUZZLE_SCORE_CACHE: Map<string, GlickoScoreT> = new Map();
const SCORES_CACHE: Map<string, Array<GlickoScoreT>> = new Map();

export async function writeCacheToDB(db: FirebaseFirestore.Firestore) {
  for (const [playerId, score] of PLAYER_SCORE_CACHE.entries()) {
    const scores = SCORES_CACHE.get(playerId) || [];

    await db.collection('prefs').doc(playerId).set(
      {
        rtg: score,
        rtgs: scores,
      },
      { merge: true }
    );
  }

  for (const [puzzleId, score] of PUZZLE_SCORE_CACHE.entries()) {
    await db.collection('c').doc(puzzleId).set({ rtg: score }, { merge: true });
  }
}

export class CrosshareGlickoRound extends GlickoRound {
  db = admin.firestore();
  readFromCacheOnly: boolean;

  constructor(roundNumber: number, readFromCacheOnly: boolean) {
    super(roundNumber, PLAYER_MIN_RD, PUZZLE_MIN_RD, PLAYER_C_SQ, PUZZLE_C_SQ);
    this.readFromCacheOnly = readFromCacheOnly;
  }

  savePlayerScore = async (playerId: string, score: GlickoScoreT) => {
    PLAYER_SCORE_CACHE.set(playerId, score);
    const scores = SCORES_CACHE.get(playerId) || [];
    scores.push(score);
    SCORES_CACHE.set(playerId, scores);
    return;
  };

  savePuzzleScore = async (puzzleId: string, score: GlickoScoreT) => {
    PUZZLE_SCORE_CACHE.set(puzzleId, score);
    return;
  };

  loadPlayerScore = async (playerId: string) => {
    const score = PLAYER_SCORE_CACHE.get(playerId);
    if (score || this.readFromCacheOnly) {
      return score;
    }

    const res = await this.db.collection('prefs').doc(playerId).get();
    if (!res.exists) return undefined;
    const vr = AccountPrefsV.decode(res.data());
    if (isRight(vr) && vr.right.rtg) {
      if (vr.right.rtg.u >= this.currentRound) {
        return undefined;
      }
      PLAYER_SCORE_CACHE.set(playerId, vr.right.rtg);
      SCORES_CACHE.set(playerId, vr.right.rtgs || []);
      return vr.right.rtg;
    }
    return undefined;
  };

  loadPuzzleScore = async (puzzleId: string) => {
    const score = PUZZLE_SCORE_CACHE.get(puzzleId);
    if (score || this.readFromCacheOnly) {
      return score;
    }

    const res = await this.db.collection('c').doc(puzzleId).get();
    if (!res.exists) {
      throw new Error('puzzle does not exist');
    }
    const vr = DBPuzzleV.decode(res.data());
    if (isRight(vr) && vr.right.rtg) {
      if (vr.right.rtg.u >= this.currentRound) {
        return undefined;
      }
      PUZZLE_SCORE_CACHE.set(puzzleId, vr.right.rtg);
      return vr.right.rtg;
    }
    return undefined;
  };

  addPlayToRound(play: LegacyPlayT) {
    let result = Result.Win;
    if (play.ch && play.t <= 5) {
      // If somebody reveals right away just call it a tie - they might've solved offline
      result = Result.Tie;
    } else if (play.ch) {
      // Otherwise any cheating is a loss
      result = Result.Loss;
    } else if (play.t > play.g.length * 3 && !play.do) {
      // If they took a long time it's a tie unless it was downs-only
      result = Result.Tie;
    }

    this.addMatchToRound(play.u, play.c, result);
  }
}

export async function doGlicko(db: FirebaseFirestore.Firestore) {
  const runBegin = new Date().getTime();
  let startTimestamp: FirebaseFirestore.Timestamp | null = null;
  const endTimestamp = admin.firestore.Timestamp.now();
  const value = await db.collection('cron_status').doc('ratings').get();
  const data = value.data();
  if (data) {
    const result = CronStatusV.decode(data);
    if (!isRight(result)) {
      console.error(PathReporter.report(result).join(','));
      throw new Error('Malformed cron_status');
    }
    startTimestamp = result.right.ranAt;
  }

  console.log('start', startTimestamp);
  console.log('end', endTimestamp);

  let startRound = Math.floor(1586895805 / (60 * 60 * 24));

  let readFromCacheOnly = true;
  if (startTimestamp !== null) {
    startRound = Math.floor(startTimestamp.toMillis() / (1000 * 60 * 60 * 24));
    readFromCacheOnly = false;
  }

  const endRound = Math.floor(endTimestamp.toMillis() / (1000 * 60 * 60 * 24));

  let queryEndTimestamp: FirebaseFirestore.Timestamp | null = null;
  for (let roundNumber = startRound; roundNumber < endRound; roundNumber += 1) {
    if (new Date().getTime() - runBegin > 1000 * 60 * 2) {
      console.log('run has taken too long, breaking out');
      break;
    }
    const round = new CrosshareGlickoRound(roundNumber, readFromCacheOnly);

    const queryStartTimestamp = admin.firestore.Timestamp.fromMillis(
      roundNumber * 60 * 60 * 1000 * 24
    );
    queryEndTimestamp = admin.firestore.Timestamp.fromMillis(
      (roundNumber + 1) * 60 * 60 * 1000 * 24
    );
    const value = await db
      .collection('p')
      .where('f', '==', true)
      .where('ua', '>=', queryStartTimestamp)
      .where('ua', '<', queryEndTimestamp)
      .orderBy('ua', 'asc')
      .get();
    console.log(
      'doing round ' +
        queryStartTimestamp.toDate() +
        ' for ' +
        value.size +
        ' plays'
    );
    for (const doc of value.docs) {
      const validationResult = LegacyPlayV.decode(doc.data());
      if (!isRight(validationResult)) {
        throw new Error('Malformed play');
      }
      const play = validationResult.right;
      round.addPlayToRound(play);
    }
    await round.computeAndUpdate();
  }

  console.log('writing results to db');
  await writeCacheToDB(db);
  if (queryEndTimestamp) {
    const status: CronStatusT = { ranAt: queryEndTimestamp };
    console.log('Done, logging ratings timestamp');
    await db.collection('cron_status').doc('ratings').set(status);
  }
  console.log('Finished');
}
