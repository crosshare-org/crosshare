import { ErrorPage } from '../components/ErrorPage';
import { Link } from '../components/Link';

export default function Custom404Page() {
  return (
    <ErrorPage title="Page Not Found">
      <p>We&apos;re sorry, we couldn&apos;t find the page you requested.</p>
      <p>
        Try the <Link href="/">homepage</Link>.
      </p>
    </ErrorPage>
  );
}
