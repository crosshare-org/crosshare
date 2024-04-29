import useEventListener from '@use-it/event-listener';
import type { User } from 'firebase/auth';
import { isSome } from 'fp-ts/lib/Option';
import {
  Dispatch,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { CgSidebarRight } from 'react-icons/cg';
import {
  FaEllipsisH,
  FaEyeSlash,
  FaFileImport,
  FaFillDrip,
  FaHammer,
  FaKeyboard,
  FaListOl,
  FaRegCheckCircle,
  FaRegCircle,
  FaRegFile,
  FaRegNewspaper,
  FaRegPlusSquare,
  FaSignInAlt,
  FaSquare,
  FaUser,
  FaUserLock,
  FaVolumeMute,
  FaVolumeUp,
} from 'react-icons/fa';
import { IoMdStats } from 'react-icons/io';
import { MdRefresh } from 'react-icons/md';
import { FixedSizeList as List } from 'react-window';
import * as WordDB from '../lib/WordDB';
import {
  addAutofillFieldsToEntry,
  numMatchesForEntry,
} from '../lib/autofillGrid';
import * as BA from '../lib/bitArray';
import { ExportProps, exportFile, importFile } from '../lib/converter';
import { isTextInput } from '../lib/domUtils';
import { entryAndCrossAtPosition, getCrosses, valAt } from '../lib/gridBase';
import { usePersistedBoolean, usePolyfilledResizeObserver } from '../lib/hooks';
import { fromLocalStorage } from '../lib/storage';
import { Timestamp } from '../lib/timestamp';
import {
  AutofillMessage,
  CancelAutofillMessage,
  Direction,
  KeyK,
  LoadDBMessage,
  PartialBy,
  Position,
  PuzzleInProgressT,
  PuzzleInProgressV,
  PuzzleT,
  Symmetry,
  WorkerMessage,
  fromKeyString,
  fromKeyboardEvent,
  isAutofillCompleteMessage,
  isAutofillResultMessage,
} from '../lib/types';
import { STORAGE_KEY, eqSet } from '../lib/utils';
import { ViewableEntry } from '../lib/viewableGrid';
import { getAutofillWorker } from '../lib/workerLoader';
import {
  BuilderGrid,
  BuilderState,
  ClickedFillAction,
  ImportPuzAction,
  PublishAction,
  SetHighlightAction,
  SetShowDownloadLink,
  SymmetryAction,
  builderReducer,
  getClueProps,
  initialBuilderState,
} from '../reducers/builderReducer';
import { KeypressAction, PuzzleAction } from '../reducers/commonActions';
import {
  ClickedEntryAction,
  CopyAction,
  CutAction,
  PasteAction,
} from '../reducers/gridReducer';
import { AuthProps } from './AuthHelpers';
import styles from './Builder.module.css';
import { ButtonReset } from './Buttons';
import { ClueMode } from './ClueMode';
import { ContactLinks } from './ContactLinks';
import { FullscreenCSS } from './FullscreenCSS';
import { GridView } from './Grid';
import { Histogram } from './Histogram';
import {
  BacktickKey,
  CommaKey,
  EnterKey,
  EscapeKey,
  ExclamationKey,
  KeyIcon,
  PeriodKey,
  Rebus,
  SpinnerDisabled,
  SpinnerFailed,
  SpinnerFinished,
  SpinnerWorking,
  SymmetryHorizontal,
  SymmetryIcon,
  SymmetryNone,
  SymmetryRotational,
  SymmetryVertical,
} from './Icons';
import { Keyboard } from './Keyboard';
import { NewPuzzleForm } from './NewPuzzleForm';
import { Overlay } from './Overlay';
import { SquareAndCols } from './Page';
import { PublishOverlay } from './PublishOverlay';
import { Snackbar, useSnackbar } from './Snackbar';
import {
  DefaultTopBar,
  NestedDropDown,
  TopBar,
  TopBarDropDown,
  TopBarDropDownLink,
  TopBarDropDownLinkA,
  TopBarLink,
} from './TopBar';

type BuilderProps = PartialBy<
  Omit<
    PuzzleT,
    | 'comments'
    | 'category'
    | 'authorId'
    | 'authorName'
    | 'moderated'
    | 'publishTime'
    | 'rating'
  >,
  | 'clues'
  | 'title'
  | 'constructorNotes'
  | 'blogPost'
  | 'contestAnswers'
  | 'contestSubmissions'
  | 'contestHasPrize'
  | 'contestRevealDelay'
  | 'alternateSolutions'
  | 'guestConstructor'
  | 'commentsDisabled'
  | 'isPrivate'
  | 'isPrivateUntil'
  | 'highlighted'
  | 'vBars'
  | 'hBars'
  | 'hidden'
  | 'highlight'
  | 'userTags'
>;

interface PotentialFillItemProps {
  entryIndex: number;
  value: [string, number];
  dispatch: Dispatch<ClickedFillAction>;
}
const PotentialFillItem = (props: PotentialFillItemProps) => {
  function click(e: MouseEvent) {
    e.preventDefault();
    props.dispatch({
      type: 'CLICKEDFILL',
      entryIndex: props.entryIndex,
      value: props.value[0],
    });
  }
  return (
    <ButtonReset
      className={styles.fillItem}
      onClick={click}
      text={props.value[0]}
    />
  );
};

interface PotentialFillListProps {
  header: string;
  entryLength: number;
  entryIndex: number;
  selected: boolean;
  values: [string, number][];
  dispatch: Dispatch<ClickedFillAction>;
}
const PotentialFillList = (props: PotentialFillListProps) => {
  const listRef = useRef<List>(null);
  const listParent = useRef<HTMLDivElement>(null);
  const { height = 320 } = usePolyfilledResizeObserver(listParent);
  useEffect(() => {
    if (listRef.current !== null) {
      listRef.current.scrollToItem(0);
    }
  }, [props.entryIndex, props.values]);
  return (
    <div className={styles.fillListWrapper} data-selected={props.selected}>
      <div className={styles.fillListHeader}>
        {props.header}{' '}
        <span className={styles.entryLength}>({props.entryLength})</span>
      </div>
      <div ref={listParent} className={styles.listParent}>
        <List
          ref={listRef}
          height={height}
          itemCount={props.values.length}
          itemSize={35}
          width="100%"
        >
          {({ index, style }) => {
            const value = props.values[index];
            if (value === undefined) {
              return null;
            }
            return (
              <div style={style}>
                <PotentialFillItem
                  key={index}
                  entryIndex={props.entryIndex}
                  dispatch={props.dispatch}
                  value={value}
                />
              </div>
            );
          }}
        </List>
      </div>
    </div>
  );
};

const initializeState = (props: BuilderProps & AuthProps): BuilderState => {
  const saved = fromLocalStorage(STORAGE_KEY, PuzzleInProgressV);

  return initialBuilderState({
    id: saved?.id ?? null,
    width: saved?.width ?? props.size.cols,
    height: saved?.height ?? props.size.rows,
    grid: saved?.grid ?? props.grid,
    vBars: saved?.vBars ?? props.vBars ?? [],
    hBars: saved?.hBars ?? props.hBars ?? [],
    hidden: saved?.hidden ?? props.hidden ?? [],
    highlighted: saved?.highlighted ?? props.highlighted ?? [],
    highlight: saved?.highlight ?? props.highlight ?? 'circle',
    title: saved?.title ?? props.title ?? null,
    notes: saved?.notes ?? props.constructorNotes ?? null,
    clues: saved?.clues ?? {},
    authorId: props.user.uid,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    authorName: props.user.displayName || 'Anonymous',
    editable: true,
    isPrivate: saved?.isPrivate ?? false,
    isPrivateUntil: saved?.isPrivateUntil ?? null,
    blogPost: saved?.blogPost ?? null,
    guestConstructor: saved?.guestConstructor ?? null,
    commentsDisabled:
      saved?.commentsDisabled !== undefined
        ? saved.commentsDisabled
        : props.prefs?.disableCommentsByDefault,
    contestAnswers: saved?.contestAnswers ?? null,
    contestHasPrize: saved?.contestHasPrize ?? false,
    contestRevealDelay: saved?.contestRevealDelay ?? null,
    alternates: saved?.alternates ?? null,
    userTags: saved?.userTags ?? [],
    symmetry: saved?.symmetry,
  });
};

const ImportPuzForm = (props: { dispatch: Dispatch<ImportPuzAction> }) => {
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: FileList | null) {
    if (!f?.[0]) {
      setError('No file selected');
      return;
    }
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!fileReader.result) {
        setError('No file result');
      } else if (typeof fileReader.result === 'string') {
        setError('Failed to read as binary');
      } else {
        try {
          const puzzle = importFile(new Uint8Array(fileReader.result));
          if (!puzzle) {
            setError('Failed to parse file');
          } else {
            props.dispatch({
              type: 'IMPORTPUZ',
              puz: puzzle,
            });
          }
        } catch (error) {
          if (error instanceof Error) {
            setError(error.message);
          } else {
            setError('Could not import file');
          }
          console.error(error);
        }
      }
    };
    fileReader.readAsArrayBuffer(f[0]);
  }

  return (
    <>
      {error ? (
        <>
          <p>Error: {error}</p>
          <p>
            If your puzzle isn&apos;t uploading correctly please get in touch
            via <ContactLinks /> so we can help!
          </p>
        </>
      ) : (
        ''
      )}
      <label>
        <p>
          Select a .puz file to import - any existing progress on your current
          construction will be overwritten!
        </p>
        <input
          className={styles.fileInput}
          type="file"
          accept=".puz"
          onChange={(e) => {
            handleFile(e.target.files);
          }}
        />
      </label>
    </>
  );
};

export const Builder = (props: BuilderProps & AuthProps): JSX.Element => {
  const [firstLaunch, setFirstLaunch] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === null) {
      setFirstLaunch(true);
    }
  }, []);

  const [state, dispatch] = useReducer(builderReducer, props, initializeState);

  const [autofilledGrid, setAutofilledGrid] = useState<string[]>([]);
  const [autofillInProgress, setAutofillInProgress] = useState(false);

  const getMostConstrainedEntry: () => number | null = useCallback(() => {
    if (!WordDB.wordDB) {
      throw new Error('missing db!');
    }
    const openEntries = state.grid.entries
      .filter((e) => e.completedWord === null)
      .map((e): [ViewableEntry, number] => [
        e,
        numMatchesForEntry(
          addAutofillFieldsToEntry({
            ...e,
            pattern: e.cells.map((p) => valAt(state.grid, p)).join(''),
          })
        ),
      ])
      .sort(([_a, aMatches], [_b, bMatches]) => aMatches - bMatches);
    if (openEntries.length) {
      return openEntries[0]?.[0]?.index ?? null;
    }
    return null;
  }, [state.grid]);

  const [autofillEnabled, setAutofillEnabled] = useState(true);

  // We need a ref to the current grid so we can verify it in worker.onmessage
  const currentCells = useRef(state.grid.cells);
  const currentVBars = useRef(state.grid.vBars);
  const currentHBars = useRef(state.grid.hBars);
  const priorSolves = useRef<[string[], Set<number>, Set<number>][]>([]);
  const priorWidth = useRef(state.grid.width);
  const priorHeight = useRef(state.grid.height);

  const worker = useRef<Worker | null>(null);

  useEffect(() => {
    if (!worker.current) {
      console.log('initializing autofill worker');

      if (!WordDB.wordDB) {
        throw new Error('missing db!');
      }

      worker.current = getAutofillWorker();
      worker.current.onmessage = (e) => {
        const data = e.data as WorkerMessage;
        if (isAutofillResultMessage(data)) {
          priorSolves.current.unshift([
            data.result,
            data.input[1],
            data.input[2],
          ]);
          if (
            currentCells.current.length === data.input[0].length &&
            currentCells.current.every((c, i) => c === data.input[0][i]) &&
            eqSet(currentVBars.current, data.input[1]) &&
            eqSet(currentHBars.current, data.input[2])
          ) {
            setAutofilledGrid(Array.from(data.result));
          }
        } else if (isAutofillCompleteMessage(data)) {
          setAutofillInProgress(false);
        } else {
          console.error('unhandled msg in builder: ', e.data);
        }
      };
      const loaddb: LoadDBMessage = { type: 'loaddb', db: WordDB.wordDB };
      worker.current.postMessage(loaddb);
    }

    worker.current.onerror = (error) => {
      console.error('Autofill error:', error);
    };

    return () => {
      console.log('tearing down autofill worker');
      worker.current?.terminate();
      worker.current = null;
    };
  }, []);

  const runAutofill = useCallback(() => {
    if (!worker.current) {
      throw new Error('no autofill worker!');
    }

    if (!autofillEnabled) {
      const msg: CancelAutofillMessage = { type: 'cancel' };
      setAutofillInProgress(false);
      worker.current.postMessage(msg);
      return;
    }
    currentCells.current = state.grid.cells;
    currentVBars.current = state.grid.vBars;
    currentHBars.current = state.grid.hBars;
    if (
      priorWidth.current !== state.grid.width ||
      priorHeight.current !== state.grid.height
    ) {
      priorWidth.current = state.grid.width;
      priorHeight.current = state.grid.height;
      priorSolves.current = [];
    }
    for (const [priorSolve, vBars, hBars] of priorSolves.current) {
      let match = true;
      for (const [i, cell] of state.grid.cells.entries()) {
        if (priorSolve[i] === '.' && cell !== '.') {
          match = false;
          break;
        }
        if (cell.trim() && priorSolve[i] !== cell) {
          match = false;
          break;
        }
      }
      if (!eqSet(vBars, state.grid.vBars)) {
        match = false;
      }
      if (!eqSet(hBars, state.grid.hBars)) {
        match = false;
      }
      if (match) {
        const msg: CancelAutofillMessage = { type: 'cancel' };
        setAutofillInProgress(false);
        worker.current.postMessage(msg);
        setAutofilledGrid(priorSolve);
        return;
      }
    }
    setAutofilledGrid([]);
    const autofill: AutofillMessage = {
      type: 'autofill',
      grid: state.grid.cells,
      width: state.grid.width,
      height: state.grid.height,
      vBars: state.grid.vBars,
      hBars: state.grid.hBars,
    };
    setAutofillInProgress(true);
    worker.current.postMessage(autofill);
  }, [state.grid, autofillEnabled, setAutofilledGrid, setAutofillInProgress]);
  useEffect(() => {
    runAutofill();
  }, [runAutofill]);

  useEffect(() => {
    const inProgress: PuzzleInProgressT = {
      id: state.id,
      width: state.grid.width,
      height: state.grid.height,
      grid: state.grid.cells,
      vBars: Array.from(state.grid.vBars),
      hBars: Array.from(state.grid.hBars),
      hidden: Array.from(state.grid.hidden),
      highlight: state.grid.highlight,
      highlighted: Array.from(state.grid.highlighted),
      clues: state.clues,
      title: state.title,
      notes: state.notes,
      blogPost: state.blogPost,
      guestConstructor: state.guestConstructor,
      commentsDisabled: state.commentsDisabled,
      isPrivate: state.isPrivate,
      isPrivateUntil: state.isPrivateUntil?.toMillis(),
      alternates: state.alternates,
      userTags: state.userTags,
      symmetry: state.symmetry,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inProgress));
  }, [
    state.id,
    state.clues,
    state.grid.cells,
    state.grid.width,
    state.grid.height,
    state.grid.highlight,
    state.grid.highlighted,
    state.grid.hidden,
    state.title,
    state.notes,
    state.blogPost,
    state.guestConstructor,
    state.commentsDisabled,
    state.isPrivate,
    state.isPrivateUntil,
    state.alternates,
    state.grid.vBars,
    state.grid.hBars,
    state.userTags,
    state.symmetry,
  ]);

  const reRunAutofill = useCallback(() => {
    priorSolves.current = [];
    runAutofill();
  }, [runAutofill]);

  const [clueMode, setClueMode] = useState(false);
  if (firstLaunch) {
    return (
      <>
        <DefaultTopBar />
        <div className={styles.newPuzzleWrapper}>
          <NewPuzzleForm
            dispatch={dispatch}
            onCreate={() => {
              setFirstLaunch(false);
            }}
            hideWarning
          />
        </div>
      </>
    );
  }
  if (clueMode) {
    return (
      <ClueMode
        user={props.user}
        state={state}
        puzzleId={state.id}
        authorId={state.authorId}
        dispatch={dispatch}
        blogPost={state.blogPost}
        guestConstructor={state.guestConstructor}
        title={state.title}
        notes={state.notes}
        clues={state.clues}
        completedEntries={state.grid.entries.filter((e) => e.completedWord)}
        exitClueMode={() => {
          setClueMode(false);
        }}
      />
    );
  }
  return (
    <GridMode
      getMostConstrainedEntry={getMostConstrainedEntry}
      reRunAutofill={reRunAutofill}
      user={props.user}
      isAdmin={props.isAdmin}
      autofillEnabled={autofillEnabled}
      setAutofillEnabled={setAutofillEnabled}
      autofilledGrid={autofilledGrid}
      autofillInProgress={autofillInProgress}
      state={state}
      dispatch={dispatch}
      setClueMode={setClueMode}
    />
  );
};

/* Returns the index within a word string of the start of the `active` cell,
 * if that word were used as fill for `entry`. */
const activeIndex = (
  grid: BuilderGrid,
  active: Position,
  entry: ViewableEntry
): number => {
  let j = -1;
  for (const cell of entry.cells) {
    j += 1;
    if (active.row === cell.row && active.col === cell.col) {
      return j;
    }
    // add extra for rebus:
    j = j + valAt(grid, cell).length - 1;
  }
  console.error('active not in entry', active, entry);
  throw new Error('active not in entry');
};

const lettersAtIndex = (fill: [string, number][], index: number): string => {
  let seen = '';
  for (const [word] of fill) {
    const char = word[index];
    if (char === undefined) {
      continue;
    }
    if (!seen.includes(char)) {
      seen += char;
    }
  }
  return seen;
};

const potentialFill = (
  entry: ViewableEntry,
  grid: BuilderGrid
): [string, number][] => {
  let pattern = '';
  const crosses = getCrosses(grid, entry);
  for (const [index, cell] of entry.cells.entries()) {
    const val = valAt(grid, cell);
    const cross = crosses[index];
    if (cross === undefined) {
      throw new Error('bad cross');
    }
    // If complete, remove any cells whose crosses aren't complete and show that
    if (
      entry.completedWord &&
      val.length === 1 &&
      cross.entryIndex !== null &&
      !grid.entries[cross.entryIndex]?.completedWord
    ) {
      pattern += ' ';
    } else {
      pattern += val;
    }
  }
  const successLetters = new Array<string>(entry.cells.length).fill('');
  const failLetters = new Array<string>(entry.cells.length).fill('');
  const matches = WordDB.matchingWords(
    pattern.length,
    WordDB.matchingBitmap(pattern)
  );
  return matches.filter(([word]) => {
    let j = -1;
    for (const [i, cellPos] of entry.cells.entries()) {
      j += 1;
      const cell = valAt(grid, cellPos);
      if (cell.length > 1) {
        // Handle rebuses
        j += cell.length - 1;
        continue;
      }
      if (!entry.completedWord && cell !== ' ') {
        continue;
      }
      const letter = word[j];
      if (letter === undefined) {
        throw new Error('out of bounds on ' + word);
      }
      if (successLetters[i]?.includes(letter)) {
        continue;
      }
      if (failLetters[i]?.includes(letter)) {
        return false;
      }
      const crossObj = crosses[i];
      if (crossObj === undefined) {
        throw new Error('bad crosses');
      }
      const crossIndex = crossObj.entryIndex;
      if (crossIndex === null) {
        successLetters[i] += letter;
        continue;
      }
      const cross = grid.entries[crossIndex];
      if (cross === undefined) {
        throw new Error('bad cross index');
      }
      if (cross.completedWord) {
        successLetters[i] += letter;
        continue;
      }

      let crossPattern = '';
      for (const crossCell of cross.cells) {
        if (crossCell.row === cellPos.row && crossCell.col === cellPos.col) {
          crossPattern += letter;
        } else {
          crossPattern += valAt(grid, crossCell);
        }
      }
      const newBitmap = WordDB.matchingBitmap(crossPattern);
      if (!newBitmap || BA.isZero(newBitmap)) {
        failLetters[i] += letter;
        return false;
      } else {
        successLetters[i] += letter;
      }
    }
    return true;
  });
};

const PuzDownloadLink = (props: ExportProps) => {
  const [dataURI, setDataURI] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const data = exportFile(props);
    const reader = new FileReader();
    reader.addEventListener(
      'load',
      function () {
        if (typeof reader.result === 'string') {
          setDataURI(reader.result);
        } else {
          setError('Bad result, please try again');
        }
      },
      false
    );
    reader.readAsDataURL(new Blob([data]));
  }, [props]);
  if (error) {
    return <>{error}</>;
  }
  if (!dataURI) {
    return <>Generating file...</>;
  }
  return (
    <a href={dataURI} download={props.t + '.puz'}>
      Download
    </a>
  );
};

const PuzDownloadOverlay = (props: {
  state: BuilderState;
  cancel: () => void;
}) => {
  if (props.state.grid.vBars.size || props.state.grid.hBars.size) {
    return (
      <Overlay closeCallback={props.cancel}>
        <h2>Export unsupported</h2>
        <p>
          Barred grids currently cannot be exported (.puz does not support
          bars).
        </p>
      </Overlay>
    );
  }
  return (
    <Overlay closeCallback={props.cancel}>
      <h2>Exporting .puz</h2>
      <p>
        <PuzDownloadLink
          w={props.state.grid.width}
          h={props.state.grid.height}
          g={props.state.grid.cells}
          n={props.state.authorName}
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          t={props.state.title || 'Crosshare puzzle'}
          hs={Array.from(props.state.grid.highlighted)}
          hdn={Array.from(props.state.grid.hidden)}
          cn={props.state.notes ?? undefined}
          gc={props.state.guestConstructor ?? undefined}
          {...getClueProps(
            props.state.grid.sortedEntries,
            props.state.grid.entries,
            props.state.clues,
            false
          )}
        />
      </p>
    </Overlay>
  );
};

interface GridModeProps {
  user: User;
  isAdmin: boolean;
  reRunAutofill: () => void;
  autofillEnabled: boolean;
  setAutofillEnabled: (val: boolean) => void;
  autofilledGrid: string[];
  autofillInProgress: boolean;
  state: BuilderState;
  dispatch: Dispatch<PuzzleAction>;
  setClueMode: (val: boolean) => void;
  getMostConstrainedEntry: () => number | null;
}
const GridMode = ({
  getMostConstrainedEntry,
  reRunAutofill,
  state,
  dispatch,
  setClueMode,
  ...props
}: GridModeProps) => {
  const [muted, setMuted] = usePersistedBoolean('muted', true);
  const [toggleKeyboard, setToggleKeyboard] = usePersistedBoolean(
    'keyboard',
    false
  );
  const { showSnackbar } = useSnackbar();

  const physicalKeyboardHandler = useCallback(
    (e: KeyboardEvent) => {
      const mkey = fromKeyboardEvent(e);
      if (isSome(mkey)) {
        e.preventDefault();
        if (mkey.value.k === KeyK.Enter && !state.isEnteringRebus) {
          reRunAutofill();
          return;
        }
        if (mkey.value.k === KeyK.Exclamation) {
          const entry = getMostConstrainedEntry();
          if (entry !== null) {
            const ca: ClickedEntryAction = {
              type: 'CLICKEDENTRY',
              entryIndex: entry,
            };
            dispatch(ca);
          }
          return;
        }
        if (mkey.value.k === KeyK.Undo) {
          dispatch({ type: 'UNDO' });
          return;
        }
        if (mkey.value.k === KeyK.Redo) {
          dispatch({ type: 'REDO' });
          return;
        }
        const kpa: KeypressAction = { type: 'KEYPRESS', key: mkey.value };
        dispatch(kpa);
      }
    },
    [dispatch, reRunAutofill, state.isEnteringRebus, getMostConstrainedEntry]
  );
  useEventListener('keydown', physicalKeyboardHandler);

  const copyHandler = useCallback(
    (e: ClipboardEvent) => {
      if (isTextInput(e.target)) {
        return;
      }
      dispatch({ type: 'COPY' } as CopyAction);
      e.preventDefault();
    },
    [dispatch]
  );
  useEventListener('copy', copyHandler);

  const cutHandler = useCallback(
    (e: ClipboardEvent) => {
      if (isTextInput(e.target)) {
        return;
      }
      dispatch({ type: 'CUT' } as CutAction);
      e.preventDefault();
    },
    [dispatch]
  );
  useEventListener('cut', cutHandler);

  const pasteHandler = useCallback(
    (e: ClipboardEvent) => {
      if (isTextInput(e.target)) {
        return;
      }
      const pa: PasteAction = {
        type: 'PASTE',
        content: e.clipboardData?.getData('Text') ?? '',
      };
      dispatch(pa);
      e.preventDefault();
    },
    [dispatch]
  );
  useEventListener('paste', pasteHandler);

  const fillLists = useMemo(() => {
    let left = <></>;
    let right = <></>;
    const [entry, cross] = entryAndCrossAtPosition(state.grid, state.active);
    let crossMatches = cross && potentialFill(cross, state.grid);
    let entryMatches = entry && potentialFill(entry, state.grid);

    if (
      crossMatches !== null &&
      entryMatches !== null &&
      entry !== null &&
      cross !== null
    ) {
      /* If we have both entry + cross we now filter for only matches that'd work for both. */
      const entryActiveIndex = activeIndex(state.grid, state.active, entry);
      const crossActiveIndex = activeIndex(state.grid, state.active, cross);
      const entryValidLetters = lettersAtIndex(entryMatches, entryActiveIndex);
      const crossValidLetters = lettersAtIndex(crossMatches, crossActiveIndex);
      const validLetters = (
        entryValidLetters.match(
          new RegExp('[' + crossValidLetters + ']', 'g')
        ) ?? []
      ).join('');
      entryMatches = entryMatches.filter(([word]) => {
        const l = word[entryActiveIndex];
        return l && validLetters.includes(l);
      });
      crossMatches = crossMatches.filter(([word]) => {
        const l = word[crossActiveIndex];
        return l && validLetters.includes(l);
      });
    }

    if (cross && crossMatches !== null) {
      if (cross.direction === Direction.Across) {
        left = (
          <PotentialFillList
            selected={false}
            header="Across"
            values={crossMatches}
            entryLength={cross.cells.length}
            entryIndex={cross.index}
            dispatch={dispatch}
          />
        );
      } else {
        right = (
          <PotentialFillList
            selected={false}
            header="Down"
            values={crossMatches}
            entryLength={cross.cells.length}
            entryIndex={cross.index}
            dispatch={dispatch}
          />
        );
      }
    }
    if (entry && entryMatches !== null) {
      if (entry.direction === Direction.Across) {
        left = (
          <PotentialFillList
            selected={true}
            header="Across"
            values={entryMatches}
            entryLength={entry.cells.length}
            entryIndex={entry.index}
            dispatch={dispatch}
          />
        );
      } else {
        right = (
          <PotentialFillList
            selected={true}
            header="Down"
            values={entryMatches}
            entryLength={entry.cells.length}
            entryIndex={entry.index}
            dispatch={dispatch}
          />
        );
      }
    }
    return { left, right };
  }, [state.grid, state.active, dispatch]);

  const { autofillEnabled, setAutofillEnabled } = props;
  const toggleAutofillEnabled = useCallback(() => {
    if (autofillEnabled) {
      showSnackbar('Autofill Disabled');
    }
    setAutofillEnabled(!autofillEnabled);
  }, [autofillEnabled, setAutofillEnabled, showSnackbar]);

  const stats = useMemo(() => {
    let totalLength = 0;
    const lengthHistogram: number[] = new Array<number>(
      Math.max(state.grid.width, state.grid.height) - 1
    ).fill(0);
    const lengthHistogramNames = lengthHistogram.map((_, i) =>
      (i + 2).toString()
    );

    state.grid.entries.forEach((e) => {
      totalLength += e.cells.length;
      lengthHistogram[e.cells.length - 2] += 1;
    });
    const numEntries = state.grid.entries.length;
    const averageLength = totalLength / numEntries;
    const lettersHistogram: number[] = new Array<number>(26).fill(0);
    const lettersHistogramNames = lettersHistogram.map((_, i) =>
      String.fromCharCode(i + 65)
    );
    let numBlocks = 0;
    const numTotal = state.grid.width * state.grid.height;
    state.grid.cells.forEach((s) => {
      if (s === '.') {
        numBlocks += 1;
      } else {
        const index = lettersHistogramNames.indexOf(s);
        if (index !== -1) {
          lettersHistogram[index] += 1;
        }
      }
    });
    return {
      numBlocks,
      numTotal,
      lengthHistogram,
      lengthHistogramNames,
      numEntries,
      averageLength,
      lettersHistogram,
      lettersHistogramNames,
    };
  }, [
    state.grid.entries,
    state.grid.height,
    state.grid.width,
    state.grid.cells,
  ]);

  const keyboardHandler = useCallback(
    (key: string) => {
      const mkey = fromKeyString(key);
      if (isSome(mkey)) {
        const kpa: KeypressAction = { type: 'KEYPRESS', key: mkey.value };
        dispatch(kpa);
      }
    },
    [dispatch]
  );

  const topBarChildren = useMemo(() => {
    let autofillIcon = <SpinnerDisabled />;
    let autofillReverseIcon = <SpinnerWorking />;
    let autofillReverseText = 'Enable Autofill';
    let autofillText = 'Autofill disabled';
    if (props.autofillEnabled) {
      autofillReverseIcon = <SpinnerDisabled />;
      autofillReverseText = 'Disable Autofill';
      if (props.autofillInProgress) {
        autofillIcon = <SpinnerWorking />;
        autofillText = 'Autofill in progress';
      } else if (props.autofilledGrid.length) {
        autofillIcon = <SpinnerFinished />;
        autofillText = 'Autofill complete';
      } else {
        autofillIcon = <SpinnerFailed />;
        autofillText = "Couldn't autofill this grid";
      }
    }
    return (
      <>
        <TopBarDropDown
          icon={autofillIcon}
          text="Autofill"
          hoverText={autofillText}
        >
          {() => (
            <>
              <TopBarDropDownLink
                icon={autofillReverseIcon}
                text={autofillReverseText}
                onClick={toggleAutofillEnabled}
              />
              <TopBarDropDownLink
                icon={<FaSignInAlt />}
                text="Jump to Most Constrained"
                shortcutHint={<ExclamationKey />}
                onClick={() => {
                  const entry = getMostConstrainedEntry();
                  if (entry !== null) {
                    const ca: ClickedEntryAction = {
                      type: 'CLICKEDENTRY',
                      entryIndex: entry,
                    };
                    dispatch(ca);
                  }
                }}
              />
              <TopBarDropDownLink
                icon={<MdRefresh />}
                text="Rerun Autofiller"
                shortcutHint={<EnterKey />}
                onClick={() => {
                  reRunAutofill();
                }}
              />
            </>
          )}
        </TopBarDropDown>
        <TopBarLink
          icon={<FaListOl />}
          text="Clues"
          onClick={() => {
            setClueMode(true);
          }}
        />
        <TopBarLink
          icon={<FaRegNewspaper />}
          text="Publish"
          onClick={() => {
            const a: PublishAction = {
              type: 'PUBLISH',
              publishTimestamp: Timestamp.now(),
            };
            dispatch(a);
          }}
        />
        <TopBarDropDown icon={<FaEllipsisH />} text="More">
          {(closeDropdown) => (
            <>
              <NestedDropDown
                closeParent={closeDropdown}
                icon={<FaRegPlusSquare />}
                text="New Puzzle"
              >
                {() => <NewPuzzleForm dispatch={dispatch} />}
              </NestedDropDown>
              <NestedDropDown
                closeParent={closeDropdown}
                icon={<FaFileImport />}
                text="Import .puz File"
              >
                {() => <ImportPuzForm dispatch={dispatch} />}
              </NestedDropDown>
              <TopBarDropDownLink
                icon={<FaRegFile />}
                text="Export .puz File"
                onClick={() => {
                  const a: SetShowDownloadLink = {
                    type: 'SETSHOWDOWNLOAD',
                    value: true,
                  };
                  dispatch(a);
                }}
              />
              <NestedDropDown
                closeParent={closeDropdown}
                icon={<IoMdStats />}
                text="Stats"
              >
                {() => (
                  <>
                    <h2>Grid</h2>
                    <div>
                      {state.gridIsComplete ? (
                        <FaRegCheckCircle />
                      ) : (
                        <FaRegCircle />
                      )}{' '}
                      All cells should be filled
                    </div>
                    <div>
                      {state.hasNoShortWords ? (
                        <FaRegCheckCircle />
                      ) : (
                        <FaRegCircle />
                      )}{' '}
                      All words should be at least three letters
                    </div>
                    <div>
                      {state.repeats.size > 0 ? (
                        <>
                          <FaRegCircle /> (
                          {Array.from(state.repeats).sort().join(', ')})
                        </>
                      ) : (
                        <FaRegCheckCircle />
                      )}{' '}
                      No words should be repeated
                    </div>
                    <h2 className="marginTop1-5em">Fill</h2>
                    <div>Number of words: {stats.numEntries}</div>
                    <div>
                      Mean word length: {stats.averageLength.toPrecision(3)}
                    </div>
                    <div>
                      Number of blocks: {stats.numBlocks} (
                      {((100 * stats.numBlocks) / stats.numTotal).toFixed(1)}%)
                    </div>
                    <div className={styles.statsHeader}>Word Lengths</div>
                    <Histogram
                      data={stats.lengthHistogram}
                      names={stats.lengthHistogramNames}
                    />
                    <div className={styles.statsHeader}>Letter Counts</div>
                    <Histogram
                      data={stats.lettersHistogram}
                      names={stats.lettersHistogramNames}
                    />
                  </>
                )}
              </NestedDropDown>
              <NestedDropDown
                closeParent={closeDropdown}
                icon={<SymmetryIcon type={state.symmetry} />}
                text="Change Symmetry"
              >
                {() => (
                  <>
                    <TopBarDropDownLink
                      icon={<SymmetryRotational />}
                      text="Use Rotational Symmetry"
                      onClick={() => {
                        const a: SymmetryAction = {
                          type: 'CHANGESYMMETRY',
                          symmetry: Symmetry.Rotational,
                        };
                        dispatch(a);
                      }}
                    />
                    <TopBarDropDownLink
                      icon={<SymmetryHorizontal />}
                      text="Use Horizontal Symmetry"
                      onClick={() => {
                        const a: SymmetryAction = {
                          type: 'CHANGESYMMETRY',
                          symmetry: Symmetry.Horizontal,
                        };
                        dispatch(a);
                      }}
                    />
                    <TopBarDropDownLink
                      icon={<SymmetryVertical />}
                      text="Use Vertical Symmetry"
                      onClick={() => {
                        const a: SymmetryAction = {
                          type: 'CHANGESYMMETRY',
                          symmetry: Symmetry.Vertical,
                        };
                        dispatch(a);
                      }}
                    />
                    <TopBarDropDownLink
                      icon={<SymmetryNone />}
                      text="Use No Symmetry"
                      onClick={() => {
                        const a: SymmetryAction = {
                          type: 'CHANGESYMMETRY',
                          symmetry: Symmetry.None,
                        };
                        dispatch(a);
                      }}
                    />
                    {state.grid.width === state.grid.height ? (
                      <>
                        <TopBarDropDownLink
                          icon={<SymmetryIcon type={Symmetry.DiagonalNESW} />}
                          text="Use NE/SW Diagonal Symmetry"
                          onClick={() => {
                            const a: SymmetryAction = {
                              type: 'CHANGESYMMETRY',
                              symmetry: Symmetry.DiagonalNESW,
                            };
                            dispatch(a);
                          }}
                        />
                        <TopBarDropDownLink
                          icon={<SymmetryIcon type={Symmetry.DiagonalNWSE} />}
                          text="Use NW/SE Diagonal Symmetry"
                          onClick={() => {
                            const a: SymmetryAction = {
                              type: 'CHANGESYMMETRY',
                              symmetry: Symmetry.DiagonalNWSE,
                            };
                            dispatch(a);
                          }}
                        />
                      </>
                    ) : (
                      ''
                    )}
                  </>
                )}
              </NestedDropDown>
              <TopBarDropDownLink
                icon={<FaSquare />}
                text="Toggle Block"
                shortcutHint={<PeriodKey />}
                onClick={() => {
                  const a: KeypressAction = {
                    type: 'KEYPRESS',
                    key: { k: KeyK.Dot },
                  };
                  dispatch(a);
                }}
              />
              <TopBarDropDownLink
                icon={<CgSidebarRight />}
                text="Toggle Bar"
                shortcutHint={<CommaKey />}
                onClick={() => {
                  const a: KeypressAction = {
                    type: 'KEYPRESS',
                    key: { k: KeyK.Comma },
                  };
                  dispatch(a);
                }}
              />
              <TopBarDropDownLink
                icon={<FaEyeSlash />}
                text="Toggle Cell Visibility"
                shortcutHint={<KeyIcon text="#" />}
                onClick={() => {
                  const a: KeypressAction = {
                    type: 'KEYPRESS',
                    key: { k: KeyK.Octothorp },
                  };
                  dispatch(a);
                }}
              />
              <TopBarDropDownLink
                icon={<Rebus />}
                text="Enter Rebus"
                shortcutHint={<EscapeKey />}
                onClick={() => {
                  const a: KeypressAction = {
                    type: 'KEYPRESS',
                    key: { k: KeyK.Escape },
                  };
                  dispatch(a);
                }}
              />
              <TopBarDropDownLink
                icon={
                  state.grid.highlight === 'circle' ? (
                    <FaRegCircle />
                  ) : (
                    <FaFillDrip />
                  )
                }
                text="Toggle Square Highlight"
                shortcutHint={<BacktickKey />}
                onClick={() => {
                  const a: KeypressAction = {
                    type: 'KEYPRESS',
                    key: { k: KeyK.Backtick },
                  };
                  dispatch(a);
                }}
              />
              <TopBarDropDownLink
                icon={
                  state.grid.highlight === 'circle' ? (
                    <FaFillDrip />
                  ) : (
                    <FaRegCircle />
                  )
                }
                text={
                  state.grid.highlight === 'circle'
                    ? 'Use Shade for Highlights'
                    : 'Use Circle for Highlights'
                }
                onClick={() => {
                  const a: SetHighlightAction = {
                    type: 'SETHIGHLIGHT',
                    highlight:
                      state.grid.highlight === 'circle' ? 'shade' : 'circle',
                  };
                  dispatch(a);
                }}
              />
              {muted ? (
                <TopBarDropDownLink
                  icon={<FaVolumeUp />}
                  text="Unmute"
                  onClick={() => {
                    setMuted(false);
                  }}
                />
              ) : (
                <TopBarDropDownLink
                  icon={<FaVolumeMute />}
                  text="Mute"
                  onClick={() => {
                    setMuted(true);
                  }}
                />
              )}
              <TopBarDropDownLink
                icon={<FaKeyboard />}
                text="Toggle Keyboard"
                onClick={() => {
                  setToggleKeyboard(!toggleKeyboard);
                }}
              />
              {props.isAdmin ? (
                <>
                  <TopBarDropDownLinkA
                    href="/admin"
                    icon={<FaUserLock />}
                    text="Admin"
                  />
                </>
              ) : (
                ''
              )}
              <TopBarDropDownLinkA
                href="/dashboard"
                icon={<FaHammer />}
                text="Constructor Dashboard"
              />
              <TopBarDropDownLinkA
                href="/account"
                icon={<FaUser />}
                text="Account"
              />
            </>
          )}
        </TopBarDropDown>
      </>
    );
  }, [
    getMostConstrainedEntry,
    props.autofillEnabled,
    props.autofillInProgress,
    props.autofilledGrid.length,
    stats,
    props.isAdmin,
    setClueMode,
    setMuted,
    state.grid.highlight,
    state.grid.width,
    state.grid.height,
    state.gridIsComplete,
    state.hasNoShortWords,
    state.repeats,
    state.symmetry,
    toggleAutofillEnabled,
    reRunAutofill,
    dispatch,
    muted,
    toggleKeyboard,
    setToggleKeyboard,
  ]);

  return (
    <>
      <FullscreenCSS />
      {state.alternates.length > 0 ? (
        <Snackbar
          message="The grid can't be edited if any alternate solutions are specified"
          isOpen
        />
      ) : (
        ''
      )}
      <div className={styles.page}>
        <div className="flexNone">
          <TopBar>{topBarChildren}</TopBar>
        </div>
        {state.showDownloadLink ? (
          <PuzDownloadOverlay
            state={state}
            cancel={() => {
              const a: SetShowDownloadLink = {
                type: 'SETSHOWDOWNLOAD',
                value: false,
              };
              dispatch(a);
            }}
          />
        ) : (
          ''
        )}
        {state.toPublish ? (
          <PublishOverlay
            id={state.id}
            toPublish={state.toPublish}
            warnings={state.publishWarnings}
            user={props.user}
            cancelPublish={() => {
              dispatch({ type: 'CANCELPUBLISH' });
            }}
          />
        ) : (
          ''
        )}
        {state.publishErrors.length ? (
          <Overlay
            closeCallback={() => {
              dispatch({ type: 'CLEARPUBLISHERRORS' });
            }}
          >
            <>
              <div>
                Please fix the following errors and try publishing again:
              </div>
              <ul>
                {state.publishErrors.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              {state.publishWarnings.length ? (
                <>
                  <div>Warnings:</div>
                  <ul>
                    {state.publishWarnings.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </>
              ) : (
                ''
              )}
            </>
          </Overlay>
        ) : (
          ''
        )}
        <div className={styles.squareAndColsWrap}>
          <SquareAndCols
            leftIsActive={state.active.dir === Direction.Across}
            aspectRatio={state.grid.width / state.grid.height}
            square={
              <GridView
                isEnteringRebus={state.isEnteringRebus}
                rebusValue={state.rebusValue}
                grid={state.grid}
                active={state.active}
                dispatch={dispatch}
                allowBlockEditing={true}
                autofill={props.autofillEnabled ? props.autofilledGrid : []}
                symmetry={state.symmetry}
                selection={state.selection}
              />
            }
            left={fillLists.left}
            right={fillLists.right}
            dispatch={dispatch}
          />
        </div>
        <div className="flexNone width100">
          <Keyboard
            toggleKeyboard={toggleKeyboard}
            keyboardHandler={keyboardHandler}
            muted={muted}
            showExtraKeyLayout={state.showExtraKeyLayout}
            includeBlockKey={true}
          />
        </div>
      </div>
    </>
  );
};
