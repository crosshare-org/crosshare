import Image from 'next/image';
import slateLogo from '../public/slate/Logo.png';

export const SlateHeader = () => {
  return (
    <div css={{ width: '100%', textAlign: 'center' }}>
      <div
        css={{
          maxHeight: '2.89rem',
          width: '100%',
          overflow: 'hidden',
          marginBottom: '2em',
        }}
      >
        <Image
          src={slateLogo}
          alt="Slate Crosswords"
          css={{ objectFit: 'contain', maxHeight: '2.89rem', maxWidth: '100%' }}
        />
      </div>
    </div>
  );
};
