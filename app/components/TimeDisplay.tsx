import { Trans } from '@lingui/macro';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { Locale, es, it } from 'date-fns/locale';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ToolTipText } from './ToolTipText';

const localeMap: Record<string, Locale> = { es, it, pseudo: es };

export const PastDistanceToNow = (props: { date: Date }): JSX.Element => {
  return <DistanceToNow isPast={true} {...props} />;
};

export const DistanceToNow = (props: {
  date: Date;
  isPast?: boolean;
}): JSX.Element => {
  const { locale } = useRouter();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <>{props.date.toISOString()}</>;
  }

  const dateFnsLocale = locale ? localeMap[locale] : undefined;

  if (props.isPast && props.date > new Date()) {
    return (
      <ToolTipText
        text={<Trans>just now</Trans>}
        tooltip={props.date.toISOString()}
      />
    );
  }
  return (
    <ToolTipText
      text={formatDistanceToNow(props.date, {
        addSuffix: true,
        locale: dateFnsLocale,
      })}
      tooltip={props.date.toISOString()}
    />
  );
};
