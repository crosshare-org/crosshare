import { useEffect, useState } from 'react';
import { browserRegex } from '../lib/supportedBrowsers';
import { useSnackbar } from './Snackbar';

export function BrowserWarning() {
  const { showSnackbar } = useSnackbar();
  const [shownWarning, setShownWarning] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (shownWarning) {
      return;
    }
    if (!browserRegex.test(navigator.userAgent)) {
      showSnackbar(
        'Your browser is unsupported - please update to a newer browser for the best experience'
      );
      setShownWarning(true);
    }
  }, [showSnackbar, shownWarning]);
  return null;
}
