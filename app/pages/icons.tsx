import { useState } from 'react';

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
      </div>
    </div>
  );
}
