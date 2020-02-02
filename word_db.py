import _db


def _activebits(a):
    s=bin(a)[2:][::-1]
    return sorted([i for i,d in enumerate(s) if d == '1'], reverse=True)


def _matching_bitmap(pattern):
    matches = None
    for idx in range(len(pattern)):
        letter = pattern[idx]
        if letter in "? ":
            continue
        bitmap = _db.bitmaps_by_length[len(pattern)][letter][idx]
        if matches == None:
            matches = bitmap
        else:
            matches &= bitmap
    return matches

def highest_score(pattern):
    bitmap = _matching_bitmap(pattern)
    return bitmap and _db.words_by_length[len(pattern)][bitmap.bit_length()-1]

def num_matches(pattern):
    bitmap = _matching_bitmap(pattern)
    if bitmap is None:
        return len(_db.words_by_length[len(pattern)])
    return bin(bitmap).count('1')

def matching_words(pattern):
    bitmap = _matching_bitmap(pattern)
    if bitmap is None:
        return list(_db.words_by_length[len(pattern)])
    activebits = _activebits(bitmap)
    return [_db.words_by_length[len(pattern)][i] for i in activebits]


if __name__ == "__main__":
    print(_activebits(13123))
    print(matching_words("KSTON"))
    print(matching_words(" H "))
