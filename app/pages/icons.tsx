import { useState } from 'react';

import { Identicon } from '../components/Icons';

export default function IconsTestPage() {
  const [input, setInput] = useState('');
  return (
    <div>
      <input type='text' value={input} onChange={e => setInput(e.target.value)} />
      <div>
        <Identicon id={input} />
      </div>
    </div>
  );
}
