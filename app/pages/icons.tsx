import { useState } from 'react';

import { Identicon } from '../components/Icons';

const IconTestPage = () => {
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

export default IconTestPage
