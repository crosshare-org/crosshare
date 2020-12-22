/* eslint-disable @typescript-eslint/ban-ts-comment */
import { DBPuzzleT } from './dbtypes';
import { PuzzleInProgressT, ClueT } from './types';
import { fromCells, getClueMap } from './viewableGrid';

const EXTENSION_HEADER_LENGTH = 8;
const EXTENSION_NAME_LENGTH = 4;
const CIRCLED = 0x80;
const MAGIC = 'ACROSS&DOWN';

function isPuz(bytes: Uint8Array) {
  return magicIndex(bytes) !== -1;
}

function magicIndex(bytes: Uint8Array) {
  const initialChars = String.fromCodePoint.apply(
    null,
    Array.from(bytes.slice(0, 50))
  );
  return initialChars.indexOf(MAGIC);
}

class PuzReader {
  public ix: number;
  public highlighted: Array<number>;
  public rebusMap: Uint8Array | null;
  public rebusKey: Record<number, string>;

  constructor(public buf: Uint8Array) {
    this.buf = this.buf.slice(magicIndex(this.buf) - 2);
    this.ix = 0;
    this.highlighted = [];
    this.rebusMap = null;
    this.rebusKey = {};
  }

  readShort(ix?: number) {
    if (ix === undefined) {
      // @ts-expect-error
      const val = this.buf[this.ix] | (this.buf[this.ix + 1] << 8);
      this.ix += 2;
      return val;
    }
    // @ts-expect-error
    return this.buf[ix] | (this.buf[ix + 1] << 8);
  }

  readString(length?: number) {
    const result = [];
    let count = 0;
    for (;;) {
      if (length && count === length) {
        break;
      }
      const c = this.buf[this.ix++];
      count += 1;
      if (!c) break; // null terminated
      result.push(String.fromCodePoint(c));
    }
    return result.join('');
  }

  readBytes(length: number) {
    const res = this.buf.slice(this.ix, this.ix + length);
    this.ix += length;
    return res;
  }

  readExtension() {
    const remainingLength = this.buf.length - this.ix;

    if (remainingLength >= EXTENSION_HEADER_LENGTH) {
      const name = this.readString(EXTENSION_NAME_LENGTH);
      const length = this.readShort();
      this.readShort(); // checksum
      const extension = this.readBytes(length);
      this.ix += 1; // extensions have a trailing byte
      if (name === 'GEXT') {
        for (const [i, e] of extension.entries()) {
          if (e & CIRCLED) {
            this.highlighted.push(i);
          }
        }
      } else if (name === 'GRBS') {
        this.rebusMap = extension;
      } else if (name === 'RTBL') {
        const text = String.fromCodePoint.apply(null, Array.from(extension));
        for (const solutionPair of text.split(';')) {
          if (!solutionPair) {
            continue;
          }
          const pair = solutionPair.split(':');
          // @ts-expect-error
          this.rebusKey[parseInt(pair[0], 10)] = pair[1];
        }
      }

      return true;
    }
    return false;
  }

  toCrosshare(): PuzzleInProgressT {
    const w = this.buf[0x2c];
    const h = this.buf[0x2d];
    if (w === undefined || h === undefined) {
      throw new Error('oob');
    }
    if (w < 4 || h < 4) {
      throw new Error('All grids must have at least 4 rows+cols for now');
    }
    if (w > 25 || h > 25) {
      throw new Error('All grids must have max of 25 rows+cols for now');
    }
    const scrambled = this.readShort(0x32);
    if (scrambled & 0x0004) {
      throw new Error('Cannot import scrambled .puz files');
    }
    const grid: Array<string> = [];
    for (let i = 0; i < w * h; i++) {
      const gridCell = this.buf[0x34 + i];
      if (gridCell === undefined) {
        throw new Error('oob');
      }
      grid.push(String.fromCodePoint(gridCell));
    }

    this.ix = 0x34 + 2 * w * h;
    const title = this.readString();
    this.readString(); // author
    const copyright = this.readString();
    if (copyright.indexOf('New York Times') !== -1) {
      throw new Error('Cannot import copyrighted puzzles');
    }

    const clues: Array<ClueT> = [];
    let label = 1;
    for (let i = 0; i < w * h; i++) {
      if (grid[i] == '.') continue;
      let inc = 0;
      if (
        (i % w === 0 || grid[i - 1] === '.') &&
        (i + 1) % w !== 0 &&
        grid[i + 1] !== '.'
      ) {
        clues.push({
          num: label,
          clue: this.readString(),
          dir: 0,
          explanation: null,
        });
        inc = 1;
      }
      if (
        (i < w || grid[i - w] === '.') &&
        i + w < grid.length &&
        grid[i + w] !== '.'
      ) {
        clues.push({
          num: label,
          clue: this.readString(),
          dir: 1,
          explanation: null,
        });
        inc = 1;
      }
      label += inc;
    }

    let notes = this.readString().trim() || null;
    if (notes?.match(/created (on|with) \w+\.com/i)) {
      notes = null;
    }

    let tryAnotherExtension = true;
    while (tryAnotherExtension) {
      tryAnotherExtension = this.readExtension();
    }

    if (this.rebusKey && this.rebusMap) {
      for (let i = 0; i < this.rebusMap.length; i += 1) {
        if (this.rebusMap[i]) {
          // @ts-expect-error
          grid[i] = this.rebusKey[this.rebusMap[i] - 1];
        }
      }
    }

    const viewableGrid = fromCells({
      cells: grid,
      width: w,
      height: h,
      allowBlockEditing: false,
      highlighted: new Set<number>(),
      highlight: 'circle',
      mapper: (e) => e,
    });

    return {
      width: w,
      height: h,
      grid,
      title,
      notes,
      clues: getClueMap(viewableGrid, clues),
      highlighted: this.highlighted,
      highlight: 'circle',
    };
  }
}

class PuzWriter {
  public buf: Array<number>;
  public questionCP: number;
  public blackCP: number;
  public dashCP: number;

  constructor() {
    this.buf = [];
    const questionCP = '?'.codePointAt(0);
    const blackCP = '.'.codePointAt(0);
    const dashCP = '-'.codePointAt(0);

    if (!questionCP || !blackCP || !dashCP) {
      throw new Error('could not encode fixed chars');
    }
    this.questionCP = questionCP;
    this.blackCP = blackCP;
    this.dashCP = dashCP;
  }

  pad(n: number) {
    for (let i = 0; i < n; i++) {
      this.buf.push(0);
    }
  }

  writeShort(x: number) {
    this.buf.push(x & 0xff, (x >> 8) & 0xff);
  }

  setShort(ix: number, x: number) {
    this.buf[ix] = x & 0xff;
    this.buf[ix + 1] = (x >> 8) & 0xff;
  }

  writeString(s: string | undefined, nullTerminated = true) {
    if (s === undefined) s = '';
    for (let i = 0; i < s.length; i++) {
      const cp = s.codePointAt(i);
      if (cp === undefined) {
        throw new Error('bad code point at index ' + i);
      }
      if (cp < 0x100 && cp > 0) {
        this.buf.push(cp);
      } else {
        // TODO: expose this warning through the UI
        console.error(
          'string "' + s + '" has non-ISO-8859-1 codepoint at offset ' + i
        );
        this.buf.push(this.questionCP);
      }
      if (cp >= 0x10000) i++; // advance by one codepoint
    }
    if (nullTerminated) {
      this.buf.push(0);
    }
  }

  writeHeader(puzzle: DBPuzzleT) {
    this.pad(2); // placeholder for checksum
    this.writeString('ACROSS&DOWN');
    this.pad(2); // placeholder for cib checksum
    this.pad(8); // placeholder for masked checksum
    this.writeString('1.3'); // version
    this.pad(2); // probably extra space for version string
    this.writeShort(0); // scrambled checksum
    this.pad(12); // reserved
    this.buf.push(puzzle.w);
    this.buf.push(puzzle.h);
    const numClues = puzzle.ac.length + puzzle.dc.length;
    this.writeShort(numClues);
    this.writeShort(1); // puzzle type
    this.writeShort(0); // scrambled tag
  }

  writeFill(puzzle: DBPuzzleT): [solutionLoc: number, gridLoc: number] {
    const grid = puzzle.g;
    const solutionLoc = this.buf.length;
    for (const cell of grid) {
      const char = cell.codePointAt(0);
      if (char === undefined) {
        throw new Error('cannot encode ' + cell);
      }
      this.buf.push(char); // Note: assumes grid is ISO-8859-1
    }
    const gridLoc = this.buf.length;
    for (const cell of grid) {
      this.buf.push(cell === '.' ? this.blackCP : this.dashCP);
    }
    return [solutionLoc, gridLoc];
  }

  writeStrings(puzzle: DBPuzzleT) {
    let note = 'Created on crosshare.org';
    let author = puzzle.n;
    if (puzzle.gc) {
      author = puzzle.gc;
      note = `Published by ${puzzle.n} on crosshare.org`;
    }

    const stringStart = this.buf.length;
    this.writeString(puzzle.t);
    this.writeString(author);
    this.writeString(`Copyright ${author}, all rights reserved`);
    const clues: Array<[number, string]> = [];
    for (const [i, clue] of puzzle.ac.entries()) {
      const clueNumber = puzzle.an[i];
      if (clueNumber === undefined) {
        throw new Error('oob');
      }
      clues.push([2 * clueNumber, clue]);
    }
    for (const [i, clue] of puzzle.dc.entries()) {
      const clueNumber = puzzle.dn[i];
      if (clueNumber === undefined) {
        throw new Error('oob');
      }
      clues.push([2 * clueNumber + 1, clue]);
    }
    clues.sort((a, b) => a[0] - b[0]);
    for (const clue of clues) {
      this.writeString(clue[1]);
    }
    this.writeString(puzzle.cn ? puzzle.cn + ' - ' + note : note);
    return stringStart;
  }

  checksumRegion(base: number, len: number, cksum: number): number {
    for (let i = 0; i < len; i++) {
      cksum = (cksum >> 1) | ((cksum & 1) << 15);
      cksum = (cksum + (this.buf[base + i] ?? 0)) & 0xffff;
    }
    return cksum;
  }

  strlen(ix: number) {
    let i = 0;
    while (this.buf[ix + i]) i++;
    return i;
  }

  checksumStrings(cksum: number, stringLoc: number, numClues: number) {
    let ix = stringLoc;
    for (let i = 0; i < 3; i++) {
      const len = this.strlen(ix);
      if (len) {
        cksum = this.checksumRegion(ix, len + 1, cksum);
      }
      ix += len + 1;
    }
    for (let i = 0; i < numClues; i++) {
      const len = this.strlen(ix);
      cksum = this.checksumRegion(ix, len, cksum);
      ix += len + 1;
    }
    const len = this.strlen(ix);
    if (len) {
      cksum = this.checksumRegion(ix, len + 1, cksum);
    }
    ix += len + 1;
    return cksum;
  }

  setMaskedChecksum(
    i: number,
    maskLow: number,
    maskHigh: number,
    cksum: number
  ) {
    this.buf[0x10 + i] = maskLow ^ (cksum & 0xff);
    this.buf[0x14 + i] = maskHigh ^ (cksum >> 8);
  }

  computeChecksums(
    stringLoc: number,
    solutionLoc: number,
    gridLoc: number,
    size: number,
    numClues: number
  ) {
    const c_cib = this.checksumRegion(0x2c, 8, 0);
    this.setShort(0xe, c_cib);
    const cksum = this.checksumRegion(solutionLoc, size, c_cib);
    const cksum2 = this.checksumRegion(gridLoc, size, cksum);
    const cksum3 = this.checksumStrings(cksum2, stringLoc, numClues);
    this.setShort(0x0, cksum3);
    this.setMaskedChecksum(0, 0x49, 0x41, c_cib);
    const c_sol = this.checksumRegion(solutionLoc, size, 0);
    this.setMaskedChecksum(1, 0x43, 0x54, c_sol);
    const c_grid = this.checksumRegion(gridLoc, size, 0);
    this.setMaskedChecksum(2, 0x48, 0x45, c_grid);
    const c_part = this.checksumStrings(0, stringLoc, numClues);
    this.setMaskedChecksum(3, 0x45, 0x44, c_part);
  }

  addExtension(name: string, data: Array<number>) {
    this.writeString(name, false);
    this.writeShort(data.length);
    const checksumLoc = this.buf.length;
    this.writeShort(0); // Checksum placeholder
    const dataLoc = this.buf.length;
    for (const datum of data) {
      this.buf.push(datum);
    }
    this.buf.push(0);
    const cksum = this.checksumRegion(dataLoc, data.length, 0);
    this.setShort(checksumLoc, cksum);
  }

  addGext(highlighted: Array<number>, size: number) {
    const data: Array<number> = [];
    for (let i = 0; i < size; i++) {
      data.push(highlighted.includes(i) ? 0x80 : 0);
    }
    this.addExtension('GEXT', data);
  }

  addGrbs(grid: Array<string>, rtbl: Array<string>) {
    const data: Array<number> = [];
    for (const cell of grid) {
      data.push(rtbl.indexOf(cell) + 1);
    }
    this.addExtension('GRBS', data);
  }

  addRtbl(rtbl: Array<string>) {
    let data = '';
    for (let i = 0; i < rtbl.length; i += 1) {
      const iStr = i.toString();
      if (iStr.length < 2) {
        data += ' ';
      }
      data += `${iStr}:${rtbl[i]};`;
    }
    this.writeString('RTBL', false);
    this.writeShort(data.length);
    const checksumLoc = this.buf.length;
    this.writeShort(0); // Checksum placeholder
    const dataLoc = this.buf.length;
    this.writeString(data);
    const cksum = this.checksumRegion(dataLoc, data.length, 0);
    this.setShort(checksumLoc, cksum);
  }

  toPuz(puzzle: DBPuzzleT) {
    this.writeHeader(puzzle);
    const [solutionLoc, gridLoc] = this.writeFill(puzzle);
    const stringLoc = this.writeStrings(puzzle);
    this.computeChecksums(
      stringLoc,
      solutionLoc,
      gridLoc,
      puzzle.w * puzzle.h,
      puzzle.dc.length + puzzle.ac.length
    );

    const rebi: Set<string> = new Set();
    for (const s of puzzle.g) {
      if (s.length > 1) {
        rebi.add(s);
      }
    }
    if (rebi.size > 0) {
      const rtbl = Array.from(rebi);
      this.addGrbs(puzzle.g, rtbl);
      this.addRtbl(rtbl);
    }

    if (puzzle.hs) {
      this.addGext(puzzle.hs, puzzle.w * puzzle.h);
    }
    return new Uint8Array(this.buf);
  }
}

export function exportFile(puzzle: DBPuzzleT): Uint8Array {
  return new PuzWriter().toPuz(puzzle);
}

export function importFile(bytes: Uint8Array): PuzzleInProgressT | null {
  if (isPuz(bytes)) {
    return new PuzReader(bytes).toCrosshare();
  }
  return null;
}
