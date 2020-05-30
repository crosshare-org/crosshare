import { TwoCol } from '../components/Page';
import { TopBar } from '../components/TopBar';

export default function TwoColTestPage() {
  return (
    <>
      <TopBar />
      <TwoCol
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
