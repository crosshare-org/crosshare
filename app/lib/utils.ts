export const STORAGE_KEY = 'puzzleInProgress';

export const slugify = (...args: (string | number)[]): string => {
  const value = args.join(' ');

  return value
    .replace(/-/g, ' ')
    .normalize('NFD') // split an accented letter in the base letter and the acent
    .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '') // remove all chars not letters, numbers and spaces (to be replaced)
    .replace(/\s+/g, '-'); // separator
};

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

function normalize(n: string) {
  return n.toLowerCase().replace(/[\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '');
}

export function isMetaSolution(
  submission: string | undefined,
  solutions: Array<string>
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
  grid: Array<string>,
  answers: Array<string>,
  alts: Array<Array<[index: number, value: string]>>
): [filled: boolean, success: boolean] {
  let filled = true;
  let success = true;
  for (const [i, cell] of grid.entries()) {
    if (cell.trim() === '') {
      filled = false;
      success = false;
      break;
    }

    if (answers && cell !== answers[i]) {
      success = false;
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
    }
  }

  return [filled, success];
}
