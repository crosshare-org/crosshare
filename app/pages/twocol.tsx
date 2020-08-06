import { TwoCol } from '../components/Page';
import { DefaultTopBar } from '../components/TopBar';

export default function TwoColTestPage() {
  return (
    <>
      <DefaultTopBar />
      <TwoCol
        toggleKeyboard={false}
        keyboardHandler={(s) => { console.log(s); }}
        muted={false}
        showExtraKeyLayout={false}
        includeBlockKey={false}
        left={<div css={{ border: '1px solid black', backgroundColor: 'green', height: '100%' }}>b</div>}
        right={<div css={{ border: '1px solid black', backgroundColor: 'yellow', height: '100%' }}>c</div>}
      />
    </>
  );
}
