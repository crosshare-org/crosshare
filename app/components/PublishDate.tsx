import { Trans } from '@lingui/react/macro';
import { clsx } from '../lib/utils';
import { DistanceToNow, PastDistanceToNow } from './TimeDisplay';

export function PublishDate(props: {
  useErrorColor: boolean;
  isPrivate: number | boolean;
  isPrivateUntil: number | null;
  publishTime: number;
  showPrivateStatus: boolean;
}) {
  const publishDate = props.isPrivateUntil
    ? new Date(props.isPrivateUntil)
    : new Date(props.publishTime);

  if (props.showPrivateStatus) {
    if (props.isPrivate !== false) {
      return (
        <span className={clsx(props.useErrorColor && 'colorError')}>
          <Trans comment="The variable is a timestamp like '4 days ago' or 'hace 4 dias'">
            Published privately <PastDistanceToNow date={publishDate} />
          </Trans>
        </span>
      );
    } else if (
      props.isPrivateUntil &&
      new Date(props.isPrivateUntil) > new Date()
    ) {
      return (
        <span className={clsx(props.useErrorColor && 'colorError')}>
          <Trans comment="The variable is a timestamp like 'in 4 days' or 'en 4 dias'">
            Private, going public <DistanceToNow date={publishDate} />
          </Trans>
        </span>
      );
    }
  }

  return (
    <Trans comment="The variable is a timestamp like '4 days ago' or 'hace 4 dias'">
      Published <PastDistanceToNow date={publishDate} />
    </Trans>
  );
}
