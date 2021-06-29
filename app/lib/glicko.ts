import { GlickoScoreT, DBPuzzleV, LegacyPlayT } from './dbtypes';
import admin from 'firebase-admin';
import { AccountPrefsV } from './prefs';
import { isRight } from 'fp-ts/lib/Either';

const INITIAL_RATING = 1500;
const INITIAL_RD = 350;
const MAX_RD = 350;
const PLAYER_MIN_RD = 30;
const PUZZLE_MIN_RD = 10;
const PUZZLE_C_SQ = 2.7;
const PLAYER_C_SQ = 13.7;
const Q = 0.0057565;
const Q_SQ = Q * Q;
const PI_SQ = Math.PI * Math.PI;

export enum Result {
  Win = 1,
  Loss = 0,
  Tie = 0.5,
}

type CrosswordId = string;
type PlayerId = string;

export function timestampToRound(ts: number): number {
  return Math.abs(Math.round((ts / 1000) * 60 * 60));
}

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

  loadPlayerScore: (
    playerId: string
  ) => Promise<GlickoScoreT | undefined> = async () => undefined;
  loadPuzzleScore: (
    puzzleId: string
  ) => Promise<GlickoScoreT | undefined> = async () => undefined;
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
      const g = 1 / Math.sqrt(1 + (3 * Q_SQ * match.d * match.d) / PI_SQ);
      const e = 1 / (1 + Math.pow(10, (-g * (prevScore.r - match.r)) / 400));
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
      const matches = await Promise.all(
        playerMatches.map(async ([puzzleId, result]) => {
          const puzScore = await this.scoreForPuzzle(puzzleId);
          return { ...puzScore, s: result };
        })
      );
      const newScore = this.computeNewScore(
        userScore,
        matches,
        this.PLAYER_MIN_RD
      );
      await this.savePlayerScore(userId, newScore);
    }
    for (const [puzzleId, puzzleMatches] of this.puzzleMatches.entries()) {
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

export class CrosshareGlickoRound extends GlickoRound {
  db = admin.firestore();

  constructor(roundNumber: number) {
    super(roundNumber, PLAYER_MIN_RD, PUZZLE_MIN_RD, PLAYER_C_SQ, PUZZLE_C_SQ);
  }

  savePlayerScore = async (playerId: string, score: GlickoScoreT) => {
    await this.db
      .collection('prefs')
      .doc(playerId)
      .set({ rtg: score }, { merge: true });
    return;
  };

  savePuzzleScore = async (puzzleId: string, score: GlickoScoreT) => {
    await this.db
      .collection('c')
      .doc(puzzleId)
      .set({ rtg: score }, { merge: true });
    return;
  };

  loadPlayerScore = async (playerId: string) => {
    const res = await this.db.collection('prefs').doc(playerId).get();
    if (!res.exists) return undefined;
    const vr = AccountPrefsV.decode(res.data());
    if (isRight(vr)) {
      return vr.right.rtg;
    }
    return undefined;
  };

  loadPuzzleScore = async (puzzleId: string) => {
    const res = await this.db.collection('c').doc(puzzleId).get();
    if (!res.exists) return undefined;
    const vr = DBPuzzleV.decode(res.data());
    if (isRight(vr)) {
      return vr.right.rtg;
    }
    return undefined;
  };

  addPlayToRound(play: LegacyPlayT) {
    let result = Result.Win;
    if (play.ch) {
      result = Result.Loss;
    } else if (play.t > play.g.length * 3 && !play.do) {
      result = Result.Tie;
    }

    this.addMatchToRound(play.u, play.c, result);
  }
}
