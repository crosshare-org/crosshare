import React, { Dispatch, memo, useState } from 'react';
import { CgSidebarRight } from 'react-icons/cg';
import {
  FaEllipsisH,
  FaEraser,
  FaEyeSlash,
  FaFileImport,
  FaFillDrip,
  FaHammer,
  FaKeyboard,
  FaListOl,
  FaPalette,
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
import { GiBroom } from 'react-icons/gi';
import { IoMdStats } from 'react-icons/io';
import { MdRefresh } from 'react-icons/md';
import { Trans } from '@lingui/react/macro';

import { Timestamp } from '../lib/timestamp.js';
import { KeyK, Symmetry } from '../lib/types.js';

import {
  BuilderState,
  ClearHighlightAction,
  ImportPuzAction,
  PublishAction,
  SetShowDownloadLink,
  SymmetryAction,
  ToggleHighlightAction,
} from '../reducers/builderReducer.js';
import { KeypressAction, PuzzleAction } from '../reducers/commonActions.js';
import { ClickedEntryAction } from '../reducers/gridReducer.js';
import styles from './Builder.module.css';
import topBarStyles from './TopBar.module.css';

import { Histogram } from './Histogram.js';
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
  TildeKey,
} from './Icons.js';
import { NewPuzzleForm } from './NewPuzzleForm.js';
import {
  NestedDropDown,
  TopBarDropDown,
  TopBarDropDownLink,
  TopBarDropDownLinkA,
  TopBarLink,
} from './TopBar.js';
import { ContactLinks } from './ContactLinks.js';
import { importFile } from '../lib/converter.js';

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

const TopBarDropdownSectionHeader = ({ children }: React.PropsWithChildren) => {
  return (
    <h2 className={topBarStyles.topBarDropdownSectionHeader}>{children}</h2>
  );
};

interface TopBarDropdownSection {}
const TopBarDropdownSection = ({
  children,
}: React.PropsWithChildren<TopBarDropdownSection>) => {
  return <section>{children}</section>;
};

interface FileSectionProps {
  closeDropdown: () => void;
  dispatch: React.Dispatch<PuzzleAction>;
}
const FileSection = ({ closeDropdown, dispatch }: FileSectionProps) => {
  return (
    <TopBarDropdownSection>
      <TopBarDropdownSectionHeader>
        <Trans>File</Trans>
      </TopBarDropdownSectionHeader>
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
    </TopBarDropdownSection>
  );
};

interface GridToolsSectionProps {
  closeDropdown: () => void;
  dispatch: React.Dispatch<PuzzleAction>;
  setPickingHighlightColor: (val: boolean) => void;
  usedHighlightColors: string[];
  builderState: Pick<BuilderState, 'symmetry'> & {
    gridWidth: BuilderState['grid']['width'];
    gridHeight: BuilderState['grid']['height'];
  };
}
const GridToolsSection = ({
  closeDropdown,
  dispatch,
  setPickingHighlightColor,
  usedHighlightColors,
  builderState,
}: React.PropsWithChildren<GridToolsSectionProps>) => {
  return (
    <TopBarDropdownSection>
      <TopBarDropdownSectionHeader>
        <Trans>Grid Tools</Trans>
      </TopBarDropdownSectionHeader>
      <NestedDropDown
        closeParent={closeDropdown}
        icon={<SymmetryIcon type={builderState.symmetry} />}
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
            {builderState.gridWidth === builderState.gridHeight ? (
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
        icon={<FaRegCircle />}
        text="Toggle Circle Highlight"
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
        icon={<FaFillDrip />}
        text="Toggle Shade Highlight"
        shortcutHint={<TildeKey />}
        onClick={() => {
          const a: KeypressAction = {
            type: 'KEYPRESS',
            key: { k: KeyK.Tilde },
          };
          dispatch(a);
        }}
      />
      {usedHighlightColors.map((highlight) => (
        <TopBarDropDownLink
          key={highlight}
          icon={<FaSquare color={highlight} />}
          text="Toggle Highlight Color"
          onClick={() => {
            const a: ToggleHighlightAction = {
              type: 'TOGGLEHIGHLIGHT',
              highlight,
            };
            dispatch(a);
          }}
        />
      ))}
      {usedHighlightColors.length < 8 ? (
        <TopBarDropDownLink
          icon={<FaPalette />}
          text="Use Custom Highlight Color"
          onClick={() => {
            setPickingHighlightColor(true);
          }}
        />
      ) : (
        ''
      )}
      <TopBarDropDownLink
        icon={<GiBroom />}
        text="Clear Fill"
        onClick={() => {
          dispatch({ type: 'CLEARFILL' });
        }}
      />
      <TopBarDropDownLink
        icon={<FaEraser />}
        text="Clear Highlights for Selection"
        onClick={() => {
          const a: ClearHighlightAction = {
            type: 'CLEARHIGHLIGHT',
          };
          dispatch(a);
        }}
      />
    </TopBarDropdownSection>
  );
};

interface ViewSettingsSectionProps {
  closeDropdown: () => void;
  builderState: Pick<
    BuilderState,
    'gridIsComplete' | 'hasNoShortWords' | 'repeats'
  >;
  stats: {
    numBlocks: number;
    numTotal: number;
    lengthHistogram: number[];
    lengthHistogramNames: string[];
    numEntries: number;
    averageLength: number;
    lettersHistogram: number[];
    lettersHistogramNames: string[];
  };
  muted: boolean;
  setMuted: (val: boolean) => void;
  toggleKeyboard: boolean;
  setToggleKeyboard: (val: boolean) => void;
}
const ViewSettingsSection = ({
  closeDropdown,
  builderState,
  stats,
  muted,
  setMuted,
  toggleKeyboard,
  setToggleKeyboard,
}: ViewSettingsSectionProps) => {
  return (
    <TopBarDropdownSection>
      <TopBarDropdownSectionHeader>
        <Trans>View/Settings</Trans>
      </TopBarDropdownSectionHeader>
      <NestedDropDown
        closeParent={closeDropdown}
        icon={<IoMdStats />}
        text="Stats"
      >
        {() => (
          <>
            <h2>Grid</h2>
            <div>
              {builderState.gridIsComplete ? (
                <FaRegCheckCircle />
              ) : (
                <FaRegCircle />
              )}{' '}
              All cells should be filled
            </div>
            <div>
              {builderState.hasNoShortWords ? (
                <FaRegCheckCircle />
              ) : (
                <FaRegCircle />
              )}{' '}
              All words should be at least three letters
            </div>
            <div>
              {builderState.repeats.size > 0 ? (
                <>
                  <FaRegCircle /> (
                  {Array.from(builderState.repeats).sort().join(', ')})
                </>
              ) : (
                <FaRegCheckCircle />
              )}{' '}
              No words should be repeated
            </div>
            <h2 className="marginTop1-5em">Fill</h2>
            <div>Number of words: {stats.numEntries}</div>
            <div>Mean word length: {stats.averageLength.toPrecision(3)}</div>
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
    </TopBarDropdownSection>
  );
};

interface AccountSectionProps {
  isAdmin: boolean;
}
const AccountSection = ({ isAdmin }: AccountSectionProps) => {
  return (
    <TopBarDropdownSection>
      <TopBarDropdownSectionHeader>
        <Trans>Account</Trans>
      </TopBarDropdownSectionHeader>
      {isAdmin ? (
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
      <TopBarDropDownLinkA href="/account" icon={<FaUser />} text="Account" />
    </TopBarDropdownSection>
  );
};

interface TopBarMoreDropdownProps {
  builderState: Pick<
    BuilderState,
    'symmetry' | 'gridIsComplete' | 'hasNoShortWords' | 'repeats'
  > & {
    gridWidth: BuilderState['grid']['width'];
    gridHeight: BuilderState['grid']['height'];
  };
  stats: {
    numBlocks: number;
    numTotal: number;
    lengthHistogram: number[];
    lengthHistogramNames: string[];
    numEntries: number;
    averageLength: number;
    lettersHistogram: number[];
    lettersHistogramNames: string[];
  };
  usedHighlightColors: string[];
  setPickingHighlightColor: (val: boolean) => void;
  muted: boolean;
  setMuted: (val: boolean) => void;
  toggleKeyboard: boolean;
  setToggleKeyboard: (val: boolean) => void;
  isAdmin: boolean;
  dispatch: Dispatch<PuzzleAction>;
}

const TopBarMoreDropdown = (props: TopBarMoreDropdownProps) => {
  const {
    builderState,
    stats,
    usedHighlightColors,
    setPickingHighlightColor,
    muted,
    setMuted,
    toggleKeyboard,
    setToggleKeyboard,
    dispatch,
    isAdmin,
  } = props;
  return (
    <TopBarDropDown icon={<FaEllipsisH />} text="More">
      {(closeDropdown) => (
        <div className={topBarStyles.topBarMoreDropdown}>
          <FileSection closeDropdown={closeDropdown} dispatch={dispatch} />
          <GridToolsSection
            closeDropdown={closeDropdown}
            dispatch={dispatch}
            setPickingHighlightColor={setPickingHighlightColor}
            usedHighlightColors={usedHighlightColors}
            builderState={builderState}
          />
          <ViewSettingsSection
            closeDropdown={closeDropdown}
            builderState={builderState}
            stats={stats}
            muted={muted}
            setMuted={setMuted}
            toggleKeyboard={toggleKeyboard}
            setToggleKeyboard={setToggleKeyboard}
          />
          <AccountSection isAdmin={isAdmin} />
        </div>
      )}
    </TopBarDropDown>
  );
};

interface TopBarChildrenProps {
  autofillEnabled: boolean;
  autofillInProgress: boolean;
  autofilledGridLength: number;
  isAdmin: boolean;
  toggleAutofillEnabled: () => void;
  getMostConstrainedEntry: () => number | null;
  dispatch: Dispatch<PuzzleAction>;
  reRunAutofill: () => void;
  setClueMode: (val: boolean) => void;
  builderState: Pick<
    BuilderState,
    'symmetry' | 'gridIsComplete' | 'hasNoShortWords' | 'repeats'
  > & {
    gridWidth: BuilderState['grid']['width'];
    gridHeight: BuilderState['grid']['height'];
  };
  stats: {
    numBlocks: number;
    numTotal: number;
    lengthHistogram: number[];
    lengthHistogramNames: string[];
    numEntries: number;
    averageLength: number;
    lettersHistogram: number[];
    lettersHistogramNames: string[];
  };
  usedHighlightColors: string[];
  setPickingHighlightColor: (val: boolean) => void;
  muted: boolean;
  setMuted: (val: boolean) => void;
  toggleKeyboard: boolean;
  setToggleKeyboard: (val: boolean) => void;
}

const TopBarChildren = (props: TopBarChildrenProps) => {
  const {
    dispatch,
    toggleAutofillEnabled,
    getMostConstrainedEntry,
    reRunAutofill,
    setClueMode,
    setPickingHighlightColor,
    muted,
    setMuted,
    toggleKeyboard,
    setToggleKeyboard,
    usedHighlightColors,
    stats,
    builderState,
  } = props;
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
    } else if (props.autofilledGridLength) {
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
      <TopBarMoreDropdown
        builderState={builderState}
        stats={stats}
        usedHighlightColors={usedHighlightColors}
        setPickingHighlightColor={setPickingHighlightColor}
        muted={muted}
        setMuted={setMuted}
        toggleKeyboard={toggleKeyboard}
        setToggleKeyboard={setToggleKeyboard}
        isAdmin={props.isAdmin}
        dispatch={dispatch}
      />
    </>
  );
};

export const MemoizedTopBarChildren = memo(TopBarChildren);
