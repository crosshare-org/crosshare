import { PuzzleLink } from './PuzzleLink';
import { DefaultTopBar } from './TopBar';
import {
  CategoryIndexT, getDateString, prettifyDateString, addZeros
} from '../lib/dbtypes';

interface CategoryProps {
  puzzles: CategoryIndexT,
  categoryName: string
}

export const Category = ({ puzzles, categoryName }: CategoryProps) => {
  const today = new Date();
  const ds = addZeros(getDateString(today));

  return (
    <>
      <DefaultTopBar />
      <div css={{ margin: '1em', }}>
        <h2>Crosshare {categoryName} Puzzles</h2>
        {Object.entries(puzzles)
          .map(([k, v]) => [addZeros(k), v])
          .filter(([k, _v]) => k <= ds)
          .sort((a, b) => a[0] > b[0] ? -1 : 1)
          .map(([dateString, puzzleId]) => {
            return <PuzzleLink key={dateString} id={puzzleId} title={categoryName + ' for ' + prettifyDateString(dateString)} />;
          })}
      </div>
    </>
  );
};
