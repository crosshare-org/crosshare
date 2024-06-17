import { useEffect, useMemo, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { ClueEntryT, ClueListT, parseClueList } from '../lib/ginsbergCommon.js';
import { logAsyncErrors } from '../lib/utils.js';
import { Overlay } from './Overlay.js';
import { ColumnSpec, Table } from './Table.js';

const NYTIcon = (row: ClueEntryT) => {
  if (row.n) {
    return <FaCheck />;
  }
  return <></>;
};

const ExternalSites: [string, string][] = [
  ['Wikipedia', 'https://en.wikipedia.org/w/index.php?search=%s'],
  ['Wiktionary', 'https://en.wiktionary.org/w/index.php?search=%s'],
];

const Weekday = ['Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
const Difficulty = (row: ClueEntryT) => {
  return <>{Weekday[Math.round(row.d)] || '-'}</>;
};

interface SuggestOverlayProps {
  word: string;
  close: () => void;
  select: (clue: string) => void;
}
export const SuggestOverlay = (props: SuggestOverlayProps) => {
  const [clueList, setClueList] = useState<ClueListT | null>(null);
  const [error, setError] = useState(false);
  const [onlyNYT, setOnlyNYT] = useState(false);
  const loading = clueList === null && !error;

  const onSort = (col: keyof ClueEntryT, dir: 1 | -1) => {
    if (!clueList) {
      return;
    }
    const newCL = [...clueList];
    newCL.sort((x, y) => {
      if (x[col] < y[col]) return dir;
      if (x[col] > y[col]) return -dir;
      return 0;
    });
    setClueList(newCL);
  };

  const displayList = useMemo(
    () => (onlyNYT && clueList ? clueList.filter((c) => c.n) : clueList),
    [clueList, onlyNYT]
  );

  useEffect(() => {
    let didCancel = false;
    async function getClues() {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const res = await (await fetch(`/api/clues/${props.word}`))
        .json()
        .catch((e: unknown) => {
          console.log(e);
          setError(true);
        });
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!didCancel && res) {
        const clues = parseClueList(res).map((c) => {
          return { ...c, d: c.d / c.f - 1 };
        });
        clues.sort((x, y) => y.f - x.f);
        const nytOnly = clues.filter((c) => c.n);
        if (nytOnly.length > 5) {
          setOnlyNYT(true);
        }
        setClueList(clues);
      }
    }
    logAsyncErrors(getClues)();
    return () => {
      didCancel = true;
    };
  }, [props.word]);
  const columns: ColumnSpec<ClueEntryT>[] = [
    { key: 'c', header: 'Clue', sortable: false },
    { key: 'y', header: 'Last Seen', sortable: true, width: 110 },
    { key: 'f', header: 'Uses', sortable: true, width: 70 },
    {
      key: 'd',
      header: 'Difficulty',
      sortable: true,
      content: Difficulty,
      width: 100,
    },
    { key: 'n', header: 'NYT?', sortable: false, content: NYTIcon, width: 60 },
  ];
  return (
    <Overlay closeCallback={props.close}>
      {error ? 'Something went wrong, please try again' : ''}
      {loading ? 'Loading clues...' : ''}
      {displayList !== null && clueList !== null ? (
        <>
          <h2>
            Found {clueList.length} suggestions for <i>{props.word}</i>
          </h2>
          <h3>
            Remember, the best constructors use original clues - try not to rely
            on suggestions for all of your cluing!
          </h3>
          <div>
            <label>
              <input
                className="marginRight1em"
                type="checkbox"
                checked={onlyNYT}
                onChange={(e) => {
                  setOnlyNYT(e.target.checked);
                }}
              />
              Only show clues that have appeared in the NYT
            </label>
          </div>
          <Table
            columns={columns}
            onSort={onSort}
            data={displayList}
            onRowClick={(clicked) => {
              props.select(clicked.c);
            }}
          />
          <h3 className="marginTop1em">External Sources</h3>
          <ul>
            {ExternalSites.map((x) => (
              <li key={x[0]}>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={x[1].replace(
                    '%s',
                    encodeURIComponent(props.word.toLowerCase())
                  )}
                >
                  Search {x[0]}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : (
        ''
      )}
    </Overlay>
  );
};
