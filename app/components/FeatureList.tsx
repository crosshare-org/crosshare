import type { ReactNode } from 'react';
import styles from './FeatureList.module.css';

export function FeatureList(props: { children: ReactNode }) {
  return <div className={styles.featureList}>{props.children}</div>;
}

export function FeatureListItem(props: {
  icon: ReactNode;
  heading: string;
  text: string;
}) {
  return (
    <div className={styles.item}>
      <h3 className="textAlignCenter">{props.heading}</h3>
      <div className={styles.itemBody}>
        <div className={styles.icon}>{props.icon}</div>
        <p className="flex1">{props.text}</p>
      </div>
    </div>
  );
}
