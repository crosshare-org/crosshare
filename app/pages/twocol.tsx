import { TwoCol } from '../components/Page';
import { DefaultTopBar } from '../components/TopBar';

export default function TwoColTestPage() {
  return (
    <>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div css={{ flex: 'none' }}>
          <DefaultTopBar />
        </div>
        <div
          css={{ flex: '1 1 auto', overflow: 'scroll', position: 'relative' }}
        >
          <TwoCol
            left={
              <div
                css={{
                  border: '1px solid black',
                  backgroundColor: 'green',
                  height: '100%',
                }}
              >
                b
              </div>
            }
            right={
              <div
                css={{
                  border: '1px solid black',
                  backgroundColor: 'yellow',
                  height: '100%',
                }}
              >
                c
              </div>
            }
          />
        </div>
      </div>
    </>
  );
}
