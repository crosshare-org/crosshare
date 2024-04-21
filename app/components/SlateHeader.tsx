import { type Root } from 'hast';
import Image from 'next/image';
import slateLogoDark from '../public/slate/Logo-Dark.png';
import slateLogo from '../public/slate/Logo.png';
import { Markdown } from './Markdown';

interface SlateHeaderProps {
  title: string;
  author: string;
  publishTime: number;
  note?: Root | null;
}

export const SlateLogo = (props: { className?: string }) => {
  return (
    <div
      className={props.className}
      css={{
        maxHeight: '3.115rem',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <Image
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        src={slateLogoDark}
        alt="Slate Crosswords"
        css={{
          display: 'var(--dark-image-display)',
          objectFit: 'contain',
          maxHeight: '2.89rem',
          maxWidth: '90%',
          margin: 'auto',
        }}
      />
      <Image
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        src={slateLogo}
        alt="Slate Crosswords"
        css={{
          display: 'var(--light-image-display)',
          objectFit: 'contain',
          maxHeight: '2.89rem',
          maxWidth: '90%',
          margin: 'auto',
        }}
      />
    </div>
  );
};

export const SlateHeader = (props: SlateHeaderProps) => {
  return (
    <div css={{ width: '100%', textAlign: 'center' }}>
      <SlateLogo css={{ marginBottom: '2.27rem' }} />
      <h1
        css={{
          fontSize: '1.647rem',
          fontWeight: 'bold',
          color: 'var(--slate-title)',
          marginBottom: '1.41rem',
        }}
      >
        {props.title}
      </h1>
      {props.note ? (
        <Markdown
          css={{ fontSize: '19px', margin: ' 0 3rem 1.41rem 3rem' }}
          hast={props.note}
        />
      ) : (
        ''
      )}
      <h2
        css={{
          textTransform: 'uppercase',
          fontSize: '1rem',
          fontWeight: 'normal',
          color: 'var(--slate-subtitle)',
          letterSpacing: '0.08rem',
          marginBottom: '2.24rem',
        }}
      >
        By {props.author}
      </h2>
    </div>
  );
};
