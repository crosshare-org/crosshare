import { useState } from 'react';
import {
  FaKeyboard, FaTabletAlt
} from 'react-icons/fa';

import { SquareAndCols } from '../components/Page';
import { TopBar, TopBarLink } from '../components/TopBar';

export default () => {
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const toggleKeyboard = () => setShowKeyboard(!showKeyboard);
  const toggleTablet = () => setIsTablet(!isTablet);
  return (
    <>
      <TopBar>
        <TopBarLink icon={<FaKeyboard />} text="Toggle Keyboard" onClick={toggleKeyboard} />
        <TopBarLink icon={<FaTabletAlt />} text="Toggle Tablet" onClick={toggleTablet} />
      </TopBar>
      <SquareAndCols
        keyboardHandler={(s) => { console.log(s) }}
        muted={false}
        showKeyboard={showKeyboard}
        showExtraKeyLayout={false}
        isTablet={isTablet}
        includeBlockKey={false}
        tinyColumn={<div css={{ border: '1px solid black', backgroundColor: 'red', height: '100%' }}>TINY</div>}
        square={(size: number) => <div css={{ border: '1px solid black', backgroundColor: 'blue', height: '100%' }}>{size}</div>}
        left={<div css={{ border: '1px solid black', backgroundColor: 'green', height: '100%' }}>b</div>}
        right={<div css={{ border: '1px solid black', backgroundColor: 'yellow', height: '100%' }}>c</div>}
      />
    </>
  );
}
