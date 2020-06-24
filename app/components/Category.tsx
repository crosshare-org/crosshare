import { PuzzleLink } from './PuzzleLink';
import { DefaultTopBar } from './TopBar';
import {
  CategoryIndexT, getDateString, prettifyDateString
} from '../lib/dbtypes';

interface CategoryProps {
  puzzles: CategoryIndexT,
  categoryName: string
}

export const Category = ({ puzzles, categoryName }: CategoryProps) => {
  const today = new Date();
  today.setHours(12);
  const ds = addZeros(getDateString(today));

  function addZeros(dateString: string) {
    const groups = dateString.match(/^(\d+)-(\d+)-(\d+)$/);
    if (!groups) {
      throw new Error('Bad date string: ' + dateString);
    }
    const year = groups[1];
    let month = groups[2];
    if (month.length === 1) {
      month = '0' + month;
    }
    let date = groups[3];
    if (date.length === 1) {
      date = '0' + date;
    }
    return year + '-' + month + '-' + date;
  }

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
            return <PuzzleLink key={dateString} id={puzzleId} width={5} height={5} title={categoryName + ' for ' + prettifyDateString(dateString)} />;
          })}
      </div>
    </>
  );
};
