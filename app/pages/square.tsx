import { useState } from 'react';

import { SquareAndCols } from '../components/Page';
import { DefaultTopBar } from '../components/TopBar';

export default function SquareTestPage() {
  const [ratio, setRatio] = useState(1.0);

  return (
    <>
      <DefaultTopBar />
      <SquareAndCols
        toggleKeyboard={false}
        keyboardHandler={(s) => { console.log(s); }}
        muted={false}
        showExtraKeyLayout={false}
        includeBlockKey={false}
        aspectRatio={ratio}
        square={(width: number, height: number) => <div css={{ border: '1px solid black', backgroundColor: 'blue', height: '100%' }}><div>{width}x{height}</div><input type='number' step="0.1" min='0.1' max='10' value={ratio} onChange={e => setRatio(parseFloat(e.target.value))} /></div>}
        left={
          <div css={{ border: '1px solid black', backgroundColor: 'green' }}>
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
            b<br />
          </div>
        }
        right={
          <div css={{ border: '1px solid black', backgroundColor: 'yellow' }}>
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
            c<br />
          </div>
        }
      />
    </>
  );
}
