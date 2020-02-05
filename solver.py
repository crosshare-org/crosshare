from __future__ import annotations

from collections import namedtuple
import copy
from dataclasses import (dataclass, field)
import itertools
import math
import random
from typing import List

import word_db


DIR_ACROSS = 0
DIR_DOWN = 1


def weighted_shuffle(l):
    weighted = []
    weight_map = dict(l)
    while len(weighted) < len(l):
        choices, weights = zip(*weight_map.items())
        choice = random.choices(choices, weights)[0]
        weighted.append(choice)
        weight_map[choice] = 0
    return weighted


# (direction, [cell_idx1,...], bitmap, is_complete)
Entry = namedtuple('Entry', ['index', 'direction', 'cells', 'bitmap', 'is_complete', 'min_cost'])


def min_cost(length, bitmap):
    """Return the minimum cost of the words encoded by `bitmap`."""
    match = word_db.highest_score(length, bitmap)
    if match:
        return 1 / match[1]
    return 5

class Grid(object):

    def __init__(self, width, height, used_words, cells, entries_by_cell, entries):
        self.width = width
        self.height = height
        self.used_words = used_words
        self.cells = cells
        self.entries_by_cell = entries_by_cell
        self.entries = entries

    def grid_with_entry_decided(self, entry_index, word):
        new_grid = Grid(self.width, self.height, set(self.used_words),
                        copy.deepcopy(self.cells),
                        copy.deepcopy(self.entries_by_cell),
                        copy.deepcopy(self.entries))

        entry = new_grid.entries[entry_index]
        new_grid.used_words.add(word)
        crosses = new_grid.crosses(entry)
        for i in range(len(word)):
            current_val = new_grid.cells[entry.cells[i]]
            if current_val != ' ':
                if current_val == word[i]:
                    continue # This cell ain't changing
                else:
                    raise Exception("Cell has conflicting value", current_val, word, i)

            # update cells
            new_grid.cells[entry.cells[i]] = word[i]

            # update crossing entries
            cross = new_grid.entries[crosses[i][0]]
            cross_word = ''
            for cid in cross.cells:
                cross_word += new_grid.cells[cid]
            cross_bitmap = word_db.update_bitmap(len(cross.cells), cross.bitmap, crosses[i][1], word[i])

            if not cross_bitmap: # empty bitmap means invalid grid
                return None

            cross_completed = False
            if ' ' not in cross_word:
                cross_completed = True
                new_grid.used_words.add(cross_word)
            new_grid.entries[crosses[i][0]] = Entry(index=cross.index,
                                                    direction=cross.direction,
                                                    cells=cross.cells,
                                                    bitmap=cross_bitmap,
                                                    is_complete=cross_completed,
                                                    min_cost=min_cost(len(cross.cells), cross_bitmap))

        # update entry itself
        new_bitmap = word_db._matching_bitmap(word)
        new_grid.entries[entry_index] = Entry(index=entry.index,
                                              direction=entry.direction,
                                              cells=entry.cells,
                                              bitmap=new_bitmap,
                                              is_complete=True,
                                              min_cost=min_cost(len(word), new_bitmap))

        return new_grid

    def __str__(self):
        s = ""
        for y in range(self.height):
            for x in range(self.width):
                s += self.cells[y * self.width + x] + " "
            s += "\n"
        return s

    def min_cost(self):
        """Get a lower bound on total cost of the grid as filled in."""
        cost = 0
        for e in self.entries:
            cost += e.min_cost
        return cost

    def crosses(self, entry):
        """Given an entry tuple, get the crossing entries.

        Returns an array of (entry index, letter idx w/in that entry) of crosses."""
        cross_dir = DIR_ACROSS
        if entry.direction == DIR_ACROSS:
            cross_dir = DIR_DOWN
        crosses = []
        for cell_idx in entry.cells:
            crosses.append(self.entries_by_cell[cell_idx][cross_dir])
        return crosses

    @classmethod
    def from_template(cls, template):
        rows = template.strip('\n').split('\n')
        height = len(rows)
        width = len(rows[0])
        used_words = set()
        cells = list(template.upper().replace("\n", "").replace("#", "."))

        # [(across_entry, char_idx), (down_entry, char_idx)] index into entries array for each cell
        entries_by_cell = [[None, None] for _ in range(len(cells))]

        entries = []

        for dir in (DIR_ACROSS, DIR_DOWN):
            xincr = (dir == DIR_ACROSS) and 1 or 0
            yincr = (dir == DIR_DOWN) and 1 or 0
            iincr = xincr + yincr * width

            i = 0
            for y in range(height):
                for x in range(width):
                    start_of_row = (dir == DIR_ACROSS and x == 0) or \
                                   (dir == DIR_DOWN and y == 0)
                    start_of_entry = (cells[i] != '.' and \
                                      (start_of_row or cells[i-iincr] == '.') and \
                                      (x + xincr < width and \
                                       y + yincr < height and \
                                       cells[i+iincr] != '.'))
                    i += 1
                    if not start_of_entry:
                        continue

                    entry_cells = []
                    entry_pattern = ""
                    is_complete = True
                    xt = x
                    yt = y
                    wordlen = 0
                    while xt < width and yt < height:
                        cell_id = yt * width + xt
                        cell_val = cells[cell_id]
                        entries_by_cell[cell_id][dir] = (len(entries), wordlen)
                        if cell_val == '.':
                            break
                        if cell_val == ' ':
                            is_complete = False
                        entry_cells.append(cell_id)
                        entry_pattern += cell_val
                        xt += xincr
                        yt += yincr
                        wordlen += 1
                    entry_bitmap = word_db._matching_bitmap(entry_pattern)
                    if is_complete:
                        used_words.add(entry_pattern)
                    entry = Entry(index=len(entries),
                                  direction=dir,
                                  cells=entry_cells,
                                  bitmap=entry_bitmap,
                                  is_complete=is_complete,
                                  min_cost=min_cost(wordlen, entry_bitmap))
                    entries.append(entry)

        return cls(width, height, used_words, cells, entries_by_cell, entries)


class Solver(object):

    soln_grid = None
    soln_cost = 0

    def __init__(self, grid):
        self.initial_grid = Grid.from_template(grid)

    def _solve(self, grid, discrep=0, pitched=None):
        base_cost = grid.min_cost()
        if self.soln_grid and base_cost > self.soln_cost:
            return None

        entries_to_consider = [e for e in grid.entries if not e.is_complete]
        if not entries_to_consider: # new best soln
            print(grid)
            print(base_cost)
            self.soln_grid = grid
            self.soln_cost = base_cost
            return grid

        entries_to_consider.sort(key=lambda e: word_db.num_matches(len(e.cells), e.bitmap))
        successor = None
        successor_diff = None
        for entry in entries_to_consider:
            best_grid = None
            best_cost = None
            second_best_cost = None

            skip_entry = False
            for w in word_db.matching_words(len(entry.cells), entry.bitmap):
                word = w[0]
                score = w[1]
                if pitched and (entry.index, word) in pitched:
                    continue
                if word in grid.used_words:
                    continue

                # If we have a second_best_cost for this entry we know it's lower than existing soln cost
                cost_to_beat = second_best_cost or self.soln_cost

                # Fail fast based on score change due to this entry alone
                if cost_to_beat and base_cost - entry.min_cost + 1 / score > cost_to_beat:
                    continue

                newgrid = grid.grid_with_entry_decided(entry.index, word)
                if not newgrid:
                    continue

                newcost = newgrid.min_cost()

                # Check overall score
                if cost_to_beat and newcost > cost_to_beat:
                    continue

                if not best_grid:
                    best_grid = (newgrid, entry.index, word)
                    best_cost = newcost
                elif newcost < best_cost:
                    best_grid = (newgrid, entry.index, word)
                    second_best_cost = best_cost
                    best_cost = newcost
                elif not second_best_cost or newcost < second_best_cost:
                    second_best_cost = newcost
                    if successor_diff and second_best_cost - base_cost < successor_diff:
                        skip_entry = True
                        break

            if skip_entry:
                break

            if not best_grid: # No valid option for this entry, bad grid
                return None

            if not second_best_cost: # No backup option, so this entry is forced
                successor = best_grid
                break

            cost_diff = second_best_cost - best_cost
            if not successor or cost_diff > successor_diff:
                successor = best_grid
                successor_diff = cost_diff

        if not pitched:
            pitched = []
        self._solve(successor[0], discrep, pitched)
        if discrep and len(pitched) < discrep:
            self._solve(grid, discrep, list(pitched) + [(successor[1], successor[2])])


    def solve(self):
        self._solve(self.initial_grid, discrep=2)
        print(self.soln_grid)
        print(self.soln_cost)
        return self.soln_grid

if __name__ == "__main__":
#     test_grid = '''        ..     
#         .      
#         .      
#    .      .    
#       .   .   .
# ...   .        
#      .     .   
#        .       
#    .     .     
#         .   ...
# .   .   .      
#     .      .   
#       .        
#       .        
#      ..        '''
    test_grid = '''    .    .     
    .    .     
    .    .     
VANBURENZOPIANO
...   ..   ....
WASHINGTONYHAWK
   ..   .      
     .   .     
      .   ..   
ROOSEVELTONJOHN
....   ..   ...
JEFFERSONNYBONO
     .    .    
     .    .    
     .    .    '''

#     test_grid = '''CROC.CAPO.TACIT
# COMA.UBER.ALERO
# TWAS.RENO.XANAX
# VANBURENZOPIANO
# ...ABE..CIA....
# WASHINGTONYHAWK
# ADO..TEA.KERNEL
# GECKO.MMA.RHINE
# ENIGMA.ILL..MCI
# ROOSEVELTONJOHN
# ....LED..WAS...
# JEFFERSONNYBONO
# APOET.EVOO.AMEN
# MERIT.LUST.COED
# BEANE.SMEE.HORA'''
    solver = Solver(test_grid)
    import timeit
    count, total = timeit.Timer(lambda: solver.solve()).autorange()
    print(total/count)
