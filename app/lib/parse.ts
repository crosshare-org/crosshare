import { Direction } from './types.js';

export interface ClueReferenceData {
  direction: Direction;
  labelNumber: number;
  start: number;
  end: number;
}

const re =
  /(^|\s|\/|\()(?<numSection>(,? ?(and|or)? ?\b\d{1,3}-? ?){1,7})(?<dir>[↘↙][\uFE0E\uFE0F]?|a(cross(es)?)?\b|diagonal(\s+down(\s+right|\s+left)?)?\b|ddl\b|dg\b|d(owns?)?\b)/gi;

function directionFromMatch(dirString: string): Direction {
  // Strip emoji/text variation selectors so ↘, ↘︎, and ↘️ all match.
  const d = dirString
    .toLowerCase()
    .replace(/[\uFE0E\uFE0F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (d.startsWith('a')) {
    return Direction.Across;
  }
  if (
    d === '↘' ||
    d === 'dg' ||
    d === 'diagonal' ||
    d === 'diagonal down' ||
    d === 'diagonal down right'
  ) {
    return Direction.Diagonal;
  }
  if (
    d === '↙' ||
    d === 'ddl' ||
    d === 'diagonal down left'
  ) {
    return Direction.DiagonalDownLeft;
  }
  // down / downs / d
  return Direction.Down;
}

export const parseClueReferences = (text: string): ClueReferenceData[] => {
  const refs: ClueReferenceData[] = [];
  let match;
  re.lastIndex = 0;

  while ((match = re.exec(text)) !== null) {
    const preLength = match[1]?.length ?? 0;
    const dirString = match.groups?.dir;
    if (!dirString) {
      throw new Error('missing dir string');
    }
    const direction = directionFromMatch(dirString);
    const numSection = match.groups?.numSection;
    if (!numSection) {
      throw new Error('missing numSection');
    }
    let numMatch: RegExpExecArray | null;
    const numRe = /\d+/g;
    while ((numMatch = numRe.exec(numSection)) !== null && numMatch[0]) {
      const labelNumber = parseInt(numMatch[0]);
      refs.push({
        direction,
        labelNumber,
        start: match.index + numMatch.index + preLength,
        end: match.index + numMatch.index + numMatch[0].length + preLength,
      });
    }

    // Update the endPosition of the last match to include the length of the direction specifying text (e.g. 'across')
    const last = refs[refs.length - 1];
    if (last && match[0]) {
      last.end = match.index + match[0].length;
    }
  }
  return refs;
};

export function parseClueEnumeration(str: string): string | null {
  str = str.trim();
  let res = '';
  for (let i = str.length - 1, depth = 0; i >= 0; i--) {
    const char = str[i];
    if (char === ')') {
      depth++;
    } else if (char === '(') {
      depth--;
    }
    if (depth > 0 || (depth === 0 && char === '(')) {
      res = char + res;
    } else {
      break;
    }
  }
  return /\d/.test(res) || res === '()' ? res : null;
}
