
const b64ToI: Array<number> = [];
const iToB64: Array<string> = [];
const numBase = '0'.charCodeAt(0);
const lowerCaseBase = 'a'.charCodeAt(0);
const upperCaseBase = 'A'.charCodeAt(0);
for (let i = 0; i <= 9; ++i) {
  b64ToI[numBase + i] = i;
  iToB64[i] = String.fromCharCode(numBase + i);
}
for (let i = 0; i < 26; ++i) {
  b64ToI[lowerCaseBase + i] = i + 10;
  iToB64[i + 10] = String.fromCharCode(lowerCaseBase + i);
  b64ToI[upperCaseBase + i] = i + 36;
  iToB64[i + 36] = String.fromCharCode(upperCaseBase + i);
}
b64ToI['-'.charCodeAt(0)] = 62;
iToB64[62] = '-';
b64ToI['_'.charCodeAt(0)] = 63;
iToB64[63] = '_';

function popCount(v: number): number {
  v -= ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24);
}

export class BitArray {
  constructor(private nums: Array<number>, private usedInts: number) { }

  static zero() {
    return new this([0], 1);
  }

  static fromString(input: string, base: 32 | 64) {
    if (base === 32) {
      input = input.toLowerCase();
    }
    // We only use 30 bits out of 32 max but it keeps everything simple
    const bitsPerChar = base === 32 ? 5 : 6;
    const charsPerNum = base === 32 ? 6 : 5;

    const nums: Array<number> = [];
    let usedInts = 0;

    for (let i = 0; i < input.length; ++i) {
      const index = input.length - i - 1;
      const x = b64ToI[input.charCodeAt(index)];
      const mod = i % charsPerNum;
      if (mod === 0) {
        nums[usedInts++] = x;
      } else {
        nums[usedInts - 1] |= (x << mod * bitsPerChar);
      }
    }
    return new this(nums, usedInts);
  }

  isZero() {
    return this.usedInts === 0 || (this.usedInts === 1 && this.nums[0] === 0);
  }

  clamp() {
    while (this.usedInts > 0 && this.nums[this.usedInts - 1] === 0) {
      --this.usedInts;
    }
  }

  setBit(index: number) {
    const numIndex = Math.floor(index / 30);
    const rem = index % 30;
    for (let i = this.usedInts; i < numIndex + 1; i += 1) {
      this.usedInts += 1;
      this.nums.push(0);
    }
    this.nums[numIndex] |= (1 << rem);
  }

  toString(base: 32 | 64) {
    const bitsPerChar = base === 32 ? 5 : 6;
    const charsPerNum = base === 32 ? 6 : 5;
    const mask = (1 << bitsPerChar) - 1;
    let s = '';
    for (let i = this.usedInts - 1; i >= 0; --i) {
      for (let j = charsPerNum - 1; j >= 0; --j) {
        const char = iToB64[(this.nums[i] >> (j * bitsPerChar)) & mask];
        if (s || char !== '0') {
          s += char;
        }
      }
    }
    return s || '0';
  }

  bitLength(): number {
    if (!this.usedInts) {
      return 0;
    }
    return 30 * (this.usedInts - 1) + (32 - Math.clz32(this.nums[this.usedInts - 1]));
  }

  /** TODO we can make a faster version if we expect bit array to be sparse */
  bitCount(): number {
    let sum = 0;
    for (let i = 0; i < this.usedInts; i += 1) {
      if (this.nums[i]) {
        sum += popCount(this.nums[i]);
      }
    }
    return sum;
  }

  and(other: BitArray) {
    const nums: Array<number> = [];
    const usedInts = Math.min(this.usedInts, other.usedInts);

    for (let i = 0; i < usedInts; ++i) {
      nums[i] = this.nums[i] & other.nums[i];
    }

    const res = new BitArray(nums, usedInts);
    res.clamp();
    return res;
  }

  activeBits(): Array<number> {
    const ret = [];
    for (let i = this.usedInts - 1; i >= 0; i--) {
      let num = this.nums[i];
      while (num !== 0) {
        const t = 31 - Math.clz32(num);
        num ^= 1 << t;
        ret.push((i * 30) + t);
      }
    }
    return ret;
  }
}
