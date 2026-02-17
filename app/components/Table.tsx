import { ReactNode, useState } from 'react';
import { List, type RowComponentProps } from 'react-window';
import { useMatchMedia } from '../lib/hooks';
import { LARGE_AND_UP_RULES, SMALL_AND_UP_RULES } from '../lib/style';
import { clsx } from '../lib/utils';
import { ButtonReset } from './Buttons';
import styles from './Table.module.scss';

export interface ColumnSpec<T> {
  key: keyof T;
  header: string;
  sortable: boolean;
  content?: (row: T) => React.JSX.Element;
  width?: number;
}

function Header<T>({
  columns,
  onSort,
}: {
  columns: ColumnSpec<T>[];
  onSort: (col: keyof T, dir: 1 | -1) => void;
}): ReactNode {
  const [sortCol, setSortCol] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid var(--text)',
      }}
    >
      {columns.map((col, i) => {
        if (col.sortable) {
          return (
            <ButtonReset
              onClick={() => {
                setSortCol(col.key);
                setSortDir(sortDir === 1 ? -1 : 1);
                onSort(col.key, sortDir);
              }}
              key={i}
              className={styles.headerContent}
              style={
                col.width
                  ? {
                      width: col.width,
                    }
                  : { flex: 1 }
              }
            >
              {col.header}
              {sortCol === col.key ? (sortDir === 1 ? ' ▲' : ' ▼') : ''}
            </ButtonReset>
          );
        }
        return (
          <div
            key={i}
            className={styles.headerContent}
            style={
              col.width
                ? {
                    width: col.width,
                  }
                : { flex: 1 }
            }
          >
            {col.header}
          </div>
        );
      })}
    </div>
  );
}

function RowComponent<T>({
  index,
  style,
  data,
  onRowClick,
  columns,
}: RowComponentProps<{
  columns: ColumnSpec<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
}>) {
  const value = data[index];
  if (value === undefined) {
    return null;
  }
  return (
    <div
      className={clsx(styles.row, onRowClick ? styles.rowClick : '')}
      style={style}
      onClick={
        onRowClick
          ? () => {
              onRowClick(value);
            }
          : undefined
      }
      onKeyDown={
        onRowClick
          ? () => {
              onRowClick(value);
            }
          : undefined
      }
      role={onRowClick ? 'button' : 'listitem'}
      tabIndex={0}
    >
      {columns.map((col, i) => {
        return (
          <div
            key={i}
            className={styles.content}
            style={
              col.width
                ? {
                    width: col.width,
                  }
                : { flex: 1 }
            }
          >
            {col.content
              ? col.content(value)
              : String(value ? value[col.key] : 'error')}
          </div>
        );
      })}
    </div>
  );
}

function Data<T>({
  columns,
  data,
  onRowClick,
}: {
  columns: ColumnSpec<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
}): ReactNode {
  const smallAndUp = useMatchMedia(SMALL_AND_UP_RULES);
  const largeAndUp = useMatchMedia(LARGE_AND_UP_RULES);

  const size = largeAndUp ? 35 : smallAndUp ? 50 : 75;

  return (
    <List
      rowComponent={RowComponent}
      rowProps={{ columns, data, onRowClick }}
      rowCount={data.length}
      rowHeight={size}
    />
  );
}

export function Table<T>({
  columns,
  onSort,
  data,
  onRowClick,
}: {
  columns: ColumnSpec<T>[];
  onSort: (col: keyof T, dir: 1 | -1) => void;
  data: T[];
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className={styles.table}>
      <Header columns={columns} onSort={onSort} />
      <Data columns={columns} data={data} onRowClick={onRowClick} />
    </div>
  );
}
