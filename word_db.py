import _db
import functools


def _activebits(a):
    active = []
    while a:
        b = a.bit_length() - 1
        active.append(b)
        a -= 1 << b
    return active


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


def update_bitmap(length, bitmap, index, letter):
    if bitmap is None:
        return _db.bitmaps_by_length[length][letter][index]
    return bitmap & _db.bitmaps_by_length[length][letter][index]


@functools.lru_cache(maxsize=None)
def num_matches(length, bitmap):
    if bitmap is None:
        return len(_db.words_by_length[length])
    return bin(bitmap).count('1')


def highest_score(length, bitmap):
    if bitmap is None:
        return _db.words_by_length[length][-1]
    return bitmap and _db.words_by_length[length][bitmap.bit_length()-1]


@functools.lru_cache(maxsize=None)
def matching_words(length, bitmap):
    if bitmap is None:
        return list(_db.words_by_length[length])
    activebits = _activebits(bitmap)
    return [_db.words_by_length[length][i] for i in activebits]


if __name__ == "__main__":
    print(_activebits(13123))
    import timeit
    count, total = timeit.Timer(lambda: _activebits(13123)).autorange()
    print(total/count)
    print(matching_words("KSTON"))
    print(matching_words(" H "))
