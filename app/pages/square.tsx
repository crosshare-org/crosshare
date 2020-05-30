import { SquareAndCols } from '../components/Page';
import { TopBar } from '../components/TopBar';

export default function SquareTestPage() {
  return (
    <>
      <TopBar />
      <SquareAndCols
        keyboardHandler={(s) => { console.log(s); }}
        muted={false}
        showExtraKeyLayout={false}
        includeBlockKey={false}
        tinyColumn={<div css={{ border: '1px solid black', backgroundColor: 'red', height: '100%' }}>TINY</div>}
        square={(size: number) => <div css={{ border: '1px solid black', backgroundColor: 'blue', height: '100%' }}>{size}</div>}
        left={<div css={{ border: '1px solid black', backgroundColor: 'green', height: '100%' }}>b</div>}
        right={<div css={{ border: '1px solid black', backgroundColor: 'yellow', height: '100%' }}>c</div>}
      />
    </>
  );
}
