import { Link } from './Link';

export function PublishWarningsList(props: { warnings: string[] }) {
  return (
    <ul>
      {props.warnings.map((s, i) => (
        <li key={i}>
          {s === 'UNCHES' ? (
            <>
              Some letters are{' '}
              <Link href="/articles/what-are-unches">unchecked</Link> and the
              puzzle is not tagged as cryptic
            </>
          ) : (
            s
          )}
        </li>
      ))}
    </ul>
  );
}
