from collections import defaultdict
import string
import struct


def _activebits(a):
    s=bin(a)[2:][::-1]
    return [i for i,d in enumerate(s) if d == '1']


class WordDB(object):

    _cluedata = None
    _clueblock = None
    words = []
    clue_map = defaultdict(list)
    words_by_length = defaultdict(list)
    bitmaps_by_length = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))

    def __init__(self, cluedata_filename):
        self._cluedata = cluedata_filename
        with open(self._cluedata, 'rb') as f:
            numwords = struct.unpack('<I', f.read(4))[0]
            print("Initializing {0} words".format(numwords))

            for _ in range(numwords):
                l = struct.unpack('<B', f.read(1))[0]
                s = struct.unpack('<{}s'.format(l), f.read(l))[0].decode('ascii')
                self.words.append(s)
            self._clueblock = f.tell()

    def initialize_bitmaps(self):
        for w in self.words:
            self.words_by_length[len(w)].append(w)
        for length, wordlist in self.words_by_length.items():
            for letter in string.ascii_uppercase:
                for idx in range(length):
                    bitmap = 0
                    for word_idx in range(len(wordlist)):
                        if wordlist[word_idx][idx] == letter:
                            bitmap |= (1 << word_idx)
                    self.bitmaps_by_length[length][letter][idx] = bitmap

    def _matching_bitmap(self, pattern):
        matches = None
        for idx in range(len(pattern)):
            letter = pattern[idx]
            if letter == "?":
                continue
            bitmap = self.bitmaps_by_length[len(pattern)][letter][idx]
            if matches == None:
                matches = bitmap
            else:
                matches &= bitmap
        return matches

    def num_matches(self, pattern):
        return bin(self._matching_bitmap(pattern).count('1'))

    def matching_words(self, pattern):
        activebits = _activebits(self._matching_bitmap(pattern))
        return [self.words_by_length[len(pattern)][i] for i in activebits]

    def initialize_clue_map(self):
        with open(self._cluedata, 'rb') as f:
            f.seek(self._clueblock)
            clues = []
            clue_clues = []
            numclues = struct.unpack('<I', f.read(4))[0]
            for _ in range(numclues):
                l = struct.unpack('<B', f.read(1))[0]
                s = struct.unpack('<{}s'.format(l), f.read(l))[0]
                clues.append(s)
                numtraps = struct.unpack('<I', f.read(4))[0]
                traps = []
                for _ in range(numtraps):
                    traps.append(struct.unpack('<I', f.read(4))[0])
                clue_clues.append(traps)

            n = struct.unpack('<I', f.read(4))[0]
            while(True):
                num = struct.unpack('<h', f.read(2))[0]
                diff = struct.unpack('<h', f.read(2))[0]
                yr = struct.unpack('<h', f.read(2))[0]
                th = struct.unpack('<b', f.read(1))[0]
                pnum = struct.unpack('<b', f.read(1))[0]
                cnum = struct.unpack('<I', f.read(4))[0]
                fill = self.words[n]
                self.clue_map[fill].append({"num": num,
                                            "diff": diff,
                                            "yr": yr,
                                            "pnum": pnum,
                                            "th": th,
                                            "cnum": cnum,
                                            "text": clues[cnum],
                                            "traps": [(t, self.words[t >> 1]) for t in clue_clues[cnum]]})
                try:
                    n = struct.unpack('<I', f.read(4))[0]
                except (IndexError, struct.error):
                    break


if __name__ == "__main__":
    cd = WordDB("cluedata")
    cd.initialize_bitmaps()
    print(cd.matching_words("H??L?"))
    print(cd.matching_words("H?LLO"))
