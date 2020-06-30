import { useState } from 'react';

import { ProgressBar } from '../components/ProgressBar';
import { Identicon, PuzzleSizeIcon } from '../components/Icons';

export default function IconsTestPage() {
  const [input, setInput] = useState('');
  return (
    <div>
      <input type='text' value={input} onChange={e => setInput(e.target.value)} />
      <div css={{ fontSize: '5em' }}>
        <Identicon id={input} />
        <PuzzleSizeIcon width={5} height={5} />
        <PuzzleSizeIcon width={15} height={15} />
      </div><div css={{ margin: '1em' }}>
        <ProgressBar percentDone={0} />
      </div><div css={{ margin: '1em' }}>
        <ProgressBar percentDone={5} />
      </div><div css={{ margin: '1em' }}>
        <ProgressBar percentDone={25} />
      </div><div css={{ margin: '1em' }}>
        <ProgressBar percentDone={50} />
      </div><div css={{ margin: '1em' }}>
        <ProgressBar percentDone={75} />
      </div><div css={{ margin: '1em' }}>
        <ProgressBar percentDone={95} />
      </div><div css={{ margin: '1em' }}>
        <ProgressBar percentDone={100} />
      </div>
    </div>
  );
}
