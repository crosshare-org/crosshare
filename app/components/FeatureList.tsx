import { ReactNode } from 'react';

export function FeatureList(props: { children: ReactNode }) {
  return <div css={{
    margin: '1em',
    ['@media (min-width: 1240px)']: {
      maxWidth: '1200px',
      margin: '1em auto',
    },
    columns: '3 300px',
    columnGap: '1em',
  }}>{props.children}</div>;
}

export function FeatureListItem(props: { icon: ReactNode, heading: string, text: string }) {
  return <div css={{
    display: 'inline-block',
    margin: '0 0 1em',
    width: '100%',
  }}>
    <h3 css={{ textAlign: 'center' }}>{props.heading}</h3>
    <div css={{
      display: 'flex',
      alignItems: 'flex-start',
    }}>
      <div css={{ marginRight: '0.5em', fontSize: '200%' }}>{props.icon}</div>
      <p css={{ flex: 1 }}>{props.text}</p>
    </div>
  </div>;
}
