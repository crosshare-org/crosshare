import { jsPDF } from 'jspdf';
import { NextApiRequest, NextApiResponse } from 'next';
import { getPuzzle } from '../../../lib/puzzleCache';
import { userIdToPage } from '../../../lib/serverOnly';
import {
  Direction,
  PuzzleT,
  getClueText,
  puzzleFromDB,
} from '../../../lib/types';
import {
  ViewableEntry,
  ViewableGrid,
  addClues,
  fromCells,
} from '../../../lib/viewableGrid';

function layoutPDFClues(
  doc: jsPDF,
  puzzle: PuzzleT,
  grid: ViewableGrid<ViewableEntry>,
  squareSize: number,
  yOffset: number
) {
  const clued = addClues(grid, puzzle.clues, (_c) => {
    return { type: 'root', children: [] };
  });
  const acrossEntries = clued.entries.filter(
    (e) => e.direction === Direction.Across
  );
  const acrossClues = acrossEntries.map((e) => ({
    label: e.labelNumber.toString(),
    clue: getClueText(e),
  }));
  const downEntries = clued.entries.filter(
    (e) => e.direction === Direction.Down
  );
  const downClues = downEntries.map((e) => ({
    label: e.labelNumber.toString(),
    clue: getClueText(e),
  }));
  function marginTop(x: number, addedPage: boolean) {
    if (
      addedPage ||
      x > format.marginLeft + squareSize * puzzle.size.cols + 10
    ) {
      return 85;
    }
    return 100 + squareSize * puzzle.size.rows;
  }
  const format = {
    font: 'helvetica',
    fontSize: 9,
    labelWidth: 19,
    clueWidth: 94,
    columnSeparator: 12,
    marginBottom: doc.internal.pageSize.height - 50,
    marginLeft: 50,
    marginRight: doc.internal.pageSize.width - 50,
  };
  doc.setFont(format.font);
  doc.setFontSize(format.fontSize);
  let x = format.marginLeft;
  let y = marginTop(x, false) + yOffset;
  let addedPage = false;
  const constructorNote: { label: string; clue: string }[] = [];
  if (puzzle.constructorNotes) {
    constructorNote.push(
      { label: '', clue: puzzle.constructorNotes },
      { label: '', clue: '' }
    );
  }
  const acrossTitle = [{ label: 'ACROSS', clue: '' }];
  const downTitle = [
    { label: '', clue: '' },
    { label: 'DOWN', clue: '' },
  ];
  const allClues = constructorNote
    .concat(acrossTitle)
    .concat(acrossClues)
    .concat(downTitle)
    .concat(downClues);
  for (const [idx, clue] of allClues.entries()) {
    // Position clue on page
    const width = clue.label
      ? format.clueWidth
      : format.clueWidth + format.labelWidth;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const clueText = doc.splitTextToSize(getClueText(clue), width);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const adjustY = clueText.length * (format.fontSize + 3);

    // If we have an across/down heading make sure the first clue will fit in this column too
    let testAdjustY = adjustY;
    if (['across', 'down'].includes(clue.label.toLowerCase())) {
      const nextClue = allClues[idx + 1];
      if (!nextClue) {
        continue;
      }
      const nextWidth = nextClue.label
        ? format.clueWidth
        : format.clueWidth + format.labelWidth;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const nextClueText = doc.splitTextToSize(
        getClueText(nextClue),
        nextWidth
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      testAdjustY += nextClueText.length * (format.fontSize + 3);
    }
    if (y + testAdjustY > format.marginBottom) {
      x += format.labelWidth + format.clueWidth + format.columnSeparator;
      if (x + format.labelWidth > format.marginRight) {
        doc.addPage();
        x = format.marginLeft;
        addedPage = true;
      }
      y = marginTop(x, addedPage) + yOffset;
    }
    if (['across', 'down'].includes(clue.label.toLowerCase())) {
      // Make Across, Down headings bold
      doc.setFont('helvetica', 'bold');
      doc.text(clue.label, x, y);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text(clue.label, x + format.labelWidth - 5, y, {
        align: 'right',
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      doc.text(clueText, x + (clue.label ? format.labelWidth : 0), y);
    }
    y += adjustY;
  }
}

function layoutPDFGrid(
  doc: jsPDF,
  x: number,
  y: number,
  puzzle: PuzzleT,
  grid: ViewableGrid<ViewableEntry>
): number {
  const squareSize = Math.min(
    24,
    360 / puzzle.size.rows,
    360 / puzzle.size.cols
  );
  const format = {
    squareSize: squareSize,
    gridOrigin: { x: x, y: y },
    labelOffset: { x: squareSize / 24, y: squareSize / 4 },
    labelFontSize: squareSize / 3.5,
    lineWidth: 0.5,
    barWidth: 4,
  };
  // Draw grid
  doc.setDrawColor(0);
  doc.setLineWidth(format.lineWidth);
  for (let i = 0; i < puzzle.size.rows; i++) {
    for (let j = 0; j < puzzle.size.cols; j++) {
      const square = i * puzzle.size.cols + j;
      const highlighted = puzzle.highlighted.includes(square);
      const hidden = puzzle.hidden.includes(square);
      const barRight = puzzle.vBars.includes(square);
      const barBottom = puzzle.hBars.includes(square);
      doc.setFillColor(
        puzzle.grid[square] === '.'
          ? '#555'
          : highlighted && puzzle.highlight === 'shade'
          ? '#DDD'
          : 'white'
      );
      if (!hidden) {
        doc.rect(
          format.gridOrigin.x + j * format.squareSize,
          format.gridOrigin.y + i * format.squareSize,
          format.squareSize,
          format.squareSize,
          'FD'
        );
      }
      if (barRight) {
        doc.setLineWidth(format.barWidth);
        doc.line(
          format.gridOrigin.x + (j + 1) * format.squareSize,
          format.gridOrigin.y + i * format.squareSize,
          format.gridOrigin.x + (j + 1) * format.squareSize,
          format.gridOrigin.y + (i + 1) * format.squareSize
        );
        doc.setLineWidth(format.lineWidth);
      }
      if (barBottom) {
        doc.setLineWidth(format.barWidth);
        doc.line(
          format.gridOrigin.x + j * format.squareSize,
          format.gridOrigin.y + (i + 1) * format.squareSize,
          format.gridOrigin.x + (j + 1) * format.squareSize,
          format.gridOrigin.y + (i + 1) * format.squareSize
        );
        doc.setLineWidth(format.lineWidth);
      }
      if (highlighted && puzzle.highlight === 'circle') {
        doc.circle(
          format.gridOrigin.x + (j + 0.5) * format.squareSize,
          format.gridOrigin.y + (i + 0.5) * format.squareSize,
          format.squareSize / 2,
          'S'
        );
      }
    }
  }
  // Label grid
  doc.setFont('helvetica');
  doc.setFontSize(format.labelFontSize);
  for (let i = 0; i < puzzle.size.rows; i++) {
    for (let j = 0; j < puzzle.size.cols; j++) {
      const number = grid.cellLabels.get(i * puzzle.size.cols + j);
      if (number) {
        doc.text(
          number.toString(),
          format.gridOrigin.x + j * format.squareSize + format.labelOffset.x,
          format.gridOrigin.y + i * format.squareSize + format.labelOffset.y
        );
      }
    }
  }
  return squareSize;
}

function layoutPDFInfo(
  doc: jsPDF,
  puzzle: PuzzleT,
  constructorUsername: string | null
): number {
  doc.setFont('helvetica');
  doc.setFontSize(18);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const title: string[] = doc.splitTextToSize(
    puzzle.title,
    doc.internal.pageSize.width - 100
  );
  const extraLines = title.length - 1;
  doc.text(title, 50, 58);

  doc.setFontSize(9);

  const publishedByLine = createPublishedByLine(puzzle, constructorUsername);
  doc.text(publishedByLine, 50, 50 + 20 + extraLines * 21);
  return extraLines * 21;
}

async function getConstructor(authorId: string): Promise<string | null> {
  const res = await userIdToPage(authorId);

  return res?.i ?? null;
}

function createPublishedByLine(
  puzzle: PuzzleT,
  constructorUsername: string | null
) {
  let authorText;
  const urlText = createAttributionLink(puzzle, constructorUsername);
  if (puzzle.guestConstructor) {
    authorText = `By ${puzzle.guestConstructor} - Published by ${puzzle.authorName}${urlText}`;
  } else {
    authorText = `By ${puzzle.authorName} - Published${urlText}`;
  }
  return authorText;
}

function createAttributionLink(
  puzzle: PuzzleT,
  constructorUsername: string | null
) {
  let urlText;
  if (
    constructorUsername &&
    (puzzle.isPrivate === false ||
      (puzzle.isPrivateUntil && puzzle.isPrivateUntil < Date.now()))
  ) {
    urlText = ` on https://crosshare.org/${constructorUsername}`;
  } else {
    urlText = ` on https://crosshare.org`;
  }
  return urlText;
}

function getPdf(
  puzzle: PuzzleT,
  constructorUsername: string | null
): ArrayBuffer {
  console.log('Generating pdf for ' + puzzle.title);

  const grid = fromCells({
    mapper: (e) => e,
    width: puzzle.size.cols,
    height: puzzle.size.rows,
    cells: puzzle.grid,
    allowBlockEditing: false,
    highlighted: new Set(puzzle.highlighted),
    highlight: puzzle.highlight,
    vBars: new Set(puzzle.vBars),
    hBars: new Set(puzzle.hBars),
    hidden: new Set(puzzle.hidden),
  });

  const pdf = new jsPDF('p', 'pt');
  pdf.setProperties({
    title: puzzle.title,
    creator: 'crosshare.org',
    author: puzzle.authorName,
  });
  const extraPaddingTop = layoutPDFInfo(pdf, puzzle, constructorUsername);
  const squareSize = layoutPDFGrid(pdf, 50, 80 + extraPaddingTop, puzzle, grid);
  layoutPDFClues(pdf, puzzle, grid, squareSize, extraPaddingTop);
  return pdf.output('arraybuffer');
}

export default async function pdf(req: NextApiRequest, res: NextApiResponse) {
  const { puzzleId } = req.query;
  if (Array.isArray(puzzleId) || !puzzleId) {
    res.status(404).json({ statusCode: 404, message: 'bad puzzle params' });
    return;
  }
  const puzzle = await getPuzzle(puzzleId);
  if (!puzzle) {
    res.status(404).json({ statusCode: 404, message: 'failed to get puzzle' });
    return;
  }
  const fromDB = puzzleFromDB(puzzle);
  const constructorUsername = await getConstructor(fromDB.authorId);
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
  res.setHeader(
    'Content-Disposition',
    'inline; filename="' + puzzle.t.replace(/[^\w ]/g, '') + '.pdf"'
  );
  res.writeHead(200, { 'Content-Type': 'application/pdf' });
  res.end(Buffer.from(getPdf(fromDB, constructorUsername)));
}
