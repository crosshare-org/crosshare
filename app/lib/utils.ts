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
  return n.toLowerCase().replace(/[\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '');
}

export function isMetaSolution(
  submission: string | undefined,
  solutions: string[]
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
  return false;
}

export function checkGrid(
  grid: string[],
  answers: string[],
  alts: [index: number, value: string][][]
): [filled: boolean, success: boolean] {
  for (const cell of grid) {
    if (cell.trim() === '') {
      return [false, false];
    }
  }
  for (const [i, cell] of grid.entries()) {
    if (answers.length && cell !== answers[i]) {
      let success = false;
      // This cell is wrong, but see if any alternate solutions that have it are satisfied
      for (const alt of alts) {
        let containsOurs = false;
        let satisfied = true;
        for (const [idx, val] of alt) {
          if (idx === i) {
            containsOurs = true;
          }
          if (val !== grid[idx]) {
            satisfied = false;
          }
        }
        if (satisfied && containsOurs) {
          success = true;
          break;
        }
      }
      if (!success) {
        return [true, false];
      }
    }
  }

  return [true, true];
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
      p(...args).catch((err) => {
        console.error('Error thrown asynchronously', err);
      });
    } catch (err) {
      console.error('Error thrown synchronously', err);
    }
  };
}
