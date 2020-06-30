from collections import defaultdict
import json
import string
import struct


# See here for format info
# https://github.com/mattginsberg/cluer/blob/master/cluer.cpp
import string
digs = string.digits + string.ascii_letters
def int2base(x, base):
    if x == 0:
        return digs[0]
    digits = []
    while x:
        digits.append(digs[x % base])
        x = x // base
    digits.reverse()
    return ''.join(digits)

def inttob32(n):
    return int2base(n, 32)


class GenerateDB(object):

    _cluedata = None
    _clueblock = None
    words = []
    clue_map = defaultdict(list)
    words_by_length = defaultdict(list)
    bitmaps_by_length = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    b64_by_length = {}

    def __init__(self, cluedata_filename):
        self._cluedata = cluedata_filename
        with open(self._cluedata, 'rb') as f:
            numwords = struct.unpack('<I', f.read(4))[0]
            print("Initializing {0} words".format(numwords))

            for _ in range(numwords):
                l = struct.unpack('<B', f.read(1))[0]
                s = struct.unpack('<{}s'.format(l), f.read(l))[0].decode('ascii')
                self.words.append([s, 0])
            self._clueblock = f.tell()

    def initialize_bitmaps(self):
        self.words.sort(key=lambda w: w[1])
        for w in filter(lambda w: w[1], self.words):
            self.words_by_length[len(w[0])].append([w[0],w[1]])
        for length, wordlist in self.words_by_length.items():
            for letter in string.ascii_uppercase:
                for idx in range(length):
                    bitmap = 0
                    for word_idx in range(len(wordlist)):
                        if wordlist[word_idx][0][idx] == letter:
                            bitmap |= (1 << word_idx)
                    self.bitmaps_by_length[length][letter][idx] = bitmap
                    self.b64_by_length[str(length)+letter+str(idx)] = inttob32(bitmap)

    def initialize_clue_map_and_scores(self):
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
                fill = self.words[n][0]
                self.clue_map[fill].append({"num": num,
                                            "diff": diff,
                                            "yr": yr,
                                            "pnum": pnum,
                                            "th": th,
                                            "cnum": cnum,
                                            "text": clues[cnum],
                                            "traps": [(t, self.words[t >> 1][0]) for t in clue_clues[cnum]]})

                # Update scoring
                if not th:
                    if pnum == 8: # nyt
                        self.words[n][1] += num * 5
                    else:
                        self.words[n][1] += num

                try:
                    n = struct.unpack('<I', f.read(4))[0]
                except (IndexError, struct.error):
                    break

    def write_wordlist(self):
        with open("cluedata.txt", "w") as wordlist:
            wordlist.writelines([w[0].upper() + ';' + str(w[1]) + '\n' for w in self.words if w[1]])

    def write_db(self):
        def ddict(d):
            if isinstance(d, dict):
                for k, v in d.items():
                    if isinstance(v, dict):
                        d[k] = ddict(v)
                return dict(d)
            if isinstance(d, list):
                return [ddict(x) for x in d]
            return d

        with open("_db.json", "w") as dbjson:
            json.dump({"words": self.words_by_length,
                       "bitmaps": self.b64_by_length},
                       dbjson)
        with open("_db.py", "w") as db:
            content = ["words_by_length = {}\n".format(ddict(self.words_by_length)),
                       # "clue_map = {}".format(self.clue_map),
                       "bitmaps_by_length = {}\n".format(ddict(self.bitmaps_by_length))]
            db.writelines(content)


if __name__ == "__main__":
    print("Initializing wordlist")
    cd = GenerateDB("cluedata")
    print("Initializing scores")
    cd.initialize_clue_map_and_scores()
    print("Writing wordlist")
    cd.write_wordlist()
    # print("Initializing bitmaps")
    # cd.initialize_bitmaps()
    # print("Writing db")
    # cd.write_db()
