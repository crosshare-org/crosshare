import { useEffect, useMemo, useState } from 'react';
import { Overlay } from './Overlay';
import { FaCheck } from 'react-icons/fa';
import { Table } from 'react-fluid-table';
import orderBy from 'lodash/orderBy';
import { ClueListT, parseClueList } from '../lib/ginsbergCommon';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NYTIcon = ({ row }: { row: any }) => {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (row?.n) {
    return <FaCheck />;
  }
  return <></>;
};

const ExternalSites: Array<[string, string]> = [
  ['Wikipedia', 'https://en.wikipedia.org/w/index.php?search=%s'],
  ['Wiktionary', 'https://en.wiktionary.org/w/index.php?search=%s'],
];

const Weekday = ['Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Difficulty = ({ row }: { row: any }) => {
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
  const loading = clueList === null && error === false;

  const onSort = (col: string | null, dir: string | null) => {
    if (!clueList || !col || !dir) {
      return;
    }
    setClueList(
      orderBy(clueList, [col], [dir.toLowerCase() === 'asc' ? 'asc' : 'desc'])
    );
  };

  const displayList = useMemo(
    () => (onlyNYT && clueList ? clueList.filter((c) => c.n) : clueList),
    [clueList, onlyNYT]
  );

  useEffect(() => {
    let didCancel = false;
    async function getClues() {
      const res = await (await fetch(`/api/clues/${props.word}`))
        .json()
        .catch((e) => {
          console.log(e);
          setError(true);
        });
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!didCancel && res) {
        const clues = orderBy(
          parseClueList(res).map((c) => {
            return { ...c, d: c.d / c.f - 1 };
          }),
          ['f'],
          ['desc']
        );
        const nytOnly = clues.filter((c) => c.n);
        if (nytOnly.length > 5) {
          setOnlyNYT(true);
        }
        setClueList(clues);
      }
    }
    getClues();
    return () => {
      didCancel = true;
    };
  }, [props.word]);
  const columns = [
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
                css={{ marginRight: '1em' }}
                type="checkbox"
                checked={onlyNYT}
                onChange={(e) => setOnlyNYT(e.target.checked)}
              />
              Only show clues that have appeared in the NYT
            </label>
          </div>
          <Table
            data={displayList}
            columns={columns}
            tableHeight={400}
            onSort={onSort}
            sortColumn={'f'}
            sortDirection={'DESC'}
            onRowClick={(_e, data) => {
              const clicked = displayList[data.index];
              if (clicked) {
                props.select(clicked.c);
              }
            }}
            css={{
              backgroundColor: 'var(--overlay-inner) !important',
              '& .row-container': {
                cursor: 'pointer',
              },
              '& .row-container:hover': {
                backgroundColor: 'var(--secondary)',
              },
            }}
          />
          <h3 css={{ marginTop: '1em' }}>External Sources</h3>
          <ul>
            {ExternalSites.map(x =>
              <li key={x[0]}>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={x[1].replace('%s', encodeURIComponent(props.word.toLowerCase()))}
                >
                  Search {x[0]}
                </a>
              </li>
            )}
          </ul>
        </>
      ) : (
        ''
      )}
    </Overlay>
  );
};
