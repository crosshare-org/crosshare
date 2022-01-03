import { useEffect, useMemo, useState } from 'react';
import { Overlay } from './Overlay';
import { FaCheck } from 'react-icons/fa';
import { Table } from 'react-fluid-table';
import orderBy from 'lodash/orderBy';
import { ClueListT, parseClueList } from '../lib/ginsbergCommon';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NYTIcon = ({ row }: { row: any }) => {
  if (row?.n) {
    return <FaCheck />;
  }
  return <></>;
};

const ExternalSite = {
  WIKIPEDIA: ['Wikipedia', 'https://en.wikipedia.org/w/index.php?search=%s'],
  WIKTIONARY: ['Wiktionary', 'https://en.wiktionary.org/w/index.php?search=%s'],
  // Not sure about the terms of services on these, commented out for now:
  /*
  THESAURUS: ['Thesaurus', 'https://www.thesaurus.com/browse/%s'],
  MERRIAM_WEBSTER: ['Merriam-Webster', 'https://www.merriam-webster.com/dictionary/%s'],
  FREE_DICTIONARY: ['The Free Dictionary', 'https://www.thefreedictionary.com/%s'],
  URBAN_DICTIONARY: ['Urban Dictionary', 'https://www.urbandictionary.com/define.php?term=%s'],
  BULBAPEDIA: ['Bulbapedia', 'https://bulbapedia.bulbagarden.net/wiki/index.php?search=%s'],
  */
} as const;

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
  const [externalSite, setExternalSite] = useState<keyof typeof ExternalSite>('WIKIPEDIA');
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
          <div css={{ display: 'flex', justifyContent: 'space-between' }}>
            <label>
              <input
                css={{ marginRight: '1em' }}
                type="checkbox"
                checked={onlyNYT}
                onChange={(e) => setOnlyNYT(e.target.checked)}
              />
              Only show clues that have appeared in the NYT
            </label>
            <label>
              External site for suggestions
              <select
                css={{ marginLeft: '1em' }}
                value={externalSite}
                onChange={x => setExternalSite(x.target.value as keyof typeof ExternalSite)}
              >
                {Object.entries(ExternalSite).map(([key, [name]]) =>
                  <option key={key} value={key}>{name}</option>
                )}
              </select>
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
          <iframe
            css={{ height: '600px', width: '100%' }}
            src={ExternalSite[externalSite][1].replace('%s', encodeURIComponent(props.word.toLowerCase()))}
            frameBorder="0"
            title="External Suggestion"
          ></iframe>
        </>
      ) : (
        ''
      )}
    </Overlay>
  );
};
