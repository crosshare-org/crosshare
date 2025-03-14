import sha256 from 'fast-sha256';
import { NonEmptyArray } from './types';

export const STORAGE_KEY = 'puzzleInProgress';

export const slugify = (
  value: string | null | undefined,
  lengthLimit = 100,
  allowColon = false
): string => {
  if (!value) {
    return '';
  }

  let replaceRegex = /[^a-z0-9 ]/g;
  if (allowColon) {
    replaceRegex = /[^a-z0-9 :]/g;
  }

  return value
    .replace(/-/g, ' ')
    .normalize('NFD') // split an accented letter in the base letter and the acent
    .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
    .toLowerCase()
    .replace(replaceRegex, '') // remove all chars not letters, numbers and spaces (to be replaced)
    .trim()
    .replace(/\s+/g, '-') // separator
    .slice(0, lengthLimit);
};

export const TAG_LENGTH_LIMIT = 20;
export const TAG_LENGTH_MIN = 3;
export const TAG_QUERY_LIMIT = 3;

export const normalizeTag = (value: string): string => {
  return slugify(value, TAG_LENGTH_LIMIT);
};

function getIndex(tags: string[]): string[] {
  const index: string[][] = [[]];
  for (const tag of tags) {
    index.forEach((entry) => {
      if (entry.length < 3) {
        index.push([...entry, tag]);
      }
    });
  }
  return index.slice(1).map((a) => a.join(' '));
}

export function buildTagIndex(
  userTags: string[] | undefined,
  autoTags: string[] | undefined
): string[] {
  const allTags = (userTags ?? []).concat(autoTags ?? []);
  const normalized = Array.from(
    new Set(allTags.map(normalizeTag).filter((s) => s.length >= TAG_LENGTH_MIN))
  ).sort();
  return getIndex(normalized);
}

export function timeString(elapsed: number, fixedSize: boolean): string {
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed - hours * 3600) / 60);
  const seconds = Math.floor(elapsed - hours * 3600 - minutes * 60);
  if (hours === 0 && minutes === 0 && !fixedSize) {
    return seconds + 's';
  }
  if (hours === 0 && !fixedSize) {
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }
  return (
    hours +
    ':' +
    (minutes < 10 ? '0' : '') +
    minutes +
    ':' +
    (seconds < 10 ? '0' : '') +
    seconds
  );
}

export function fnv1a(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    const characterCode = input.charCodeAt(i);
    hash ^= characterCode;
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function normalize(n: string) {
  return n.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function metaSolutionDigest(soln: string, puzzleId: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(puzzleId + normalize(soln));
  const hashArray = Array.from(sha256(data));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function isMetaSolution(
  submission: string | undefined,
  solutions: string[],
  solutionDigests: string[],
  puzzleId: string
) {
  if (submission === undefined) {
    return false;
  }

  const normalized = normalize(submission);
  for (const solution of solutions) {
    if (normalize(solution) === normalized) {
      return true;
    }
  }

  const submittedDigest = metaSolutionDigest(submission, puzzleId);
  for (const digest of solutionDigests) {
    if (submittedDigest === digest) {
      return true;
    }
  }
  return false;
}

const MAX_SOLUTIONS = 200;
/* Given the answer key and alts return an array of all possible solutions.
 *
 * When alts are non-overlapping the number of possible solutions can explode.
 * We cap the number of possibilities and return a flag indicating if we reached
 * the cap. The UI can use that flag to warn / disable adding more alts. */
export function allSolutions(
  answer: string[],
  alts: [index: number, value: string][][]
): [NonEmptyArray<string[]>, boolean] {
  const combos: NonEmptyArray<[index: number, value: string][]> = [[]];
  let reachedLimit = false;

  for (const alt of alts) {
    for (const combo of [...combos]) {
      let compatible = true;
      for (const cell of alt) {
        const existing = combo.find(([idx]) => idx === cell[0]);
        if (existing !== undefined && existing[1] !== cell[1]) {
          compatible = false;
          break;
        }
      }
      if (compatible) {
        const newCombo = [...combo, ...alt];
        const uniq = [...new Map(newCombo.map((v) => [v[0], v])).values()];
        combos.push(uniq);
        if (combos.length >= MAX_SOLUTIONS) {
          reachedLimit = true;
          break;
        }
      }
    }
    if (reachedLimit) {
      break;
    }
  }

  function comboToSoln(alt: [index: number, value: string][]) {
    const solution = [...answer];
    for (const [k, r] of alt) {
      solution[k] = r;
    }
    return solution;
  }

  const [head, ...rest] = combos;
  return [[comboToSoln(head), ...rest.map(comboToSoln)], reachedLimit];
}

export function checkGrid(
  grid: string[],
  solutions: NonEmptyArray<string[]>
): [filled: boolean, success: boolean] {
  for (const cell of grid) {
    if (cell.trim() === '') {
      return [false, false];
    }
  }
  for (const solution of solutions) {
    let success = true;
    for (const [i, cell] of grid.entries()) {
      if (cell !== solution[i]) {
        success = false;
        break;
      }
    }
    if (success) {
      return [true, true];
    }
  }
  return [true, false];
}

export function notEmpty<TValue>(
  value: TValue | null | undefined
): value is TValue {
  return value !== null && value !== undefined;
}

export function eqSet<T>(as: Set<T>, bs: Set<T>) {
  if (as.size !== bs.size) return false;
  for (const a of as) if (!bs.has(a)) return false;
  return true;
}

export function logAsyncErrors<A extends unknown[]>(
  p: (...args: A) => Promise<void>
): (...args: A) => void {
  return (...args: A) => {
    try {
      p(...args).catch((err: unknown) => {
        console.error('Error thrown asynchronously', err);
      });
    } catch (err) {
      console.error('Error thrown synchronously', err);
    }
  };
}

export function clsx(...args: unknown[]) {
  let i = 0,
    tmp,
    str = '';
  for (; i < args.length; i++) {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, no-cond-assign
    if ((tmp = args[i])) {
      if (typeof tmp === 'string') {
        str += (str && ' ') + tmp;
      }
    }
  }
  return str;
}
