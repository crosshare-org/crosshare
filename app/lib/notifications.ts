import * as t from 'io-ts';

import { timestamp } from './timestamp';

export const NotificationV = t.intersection([
  t.type({
    /** user id receiving the notification */
    u: t.string,
    /** puzzle id to link to */
    p: t.string,
    /** text to display as */
    v: t.string,
    /** timestamp for the notification */
    t: timestamp,
    /** timestamp when the notification was seen (or emailed) */
    r: t.union([timestamp, t.null])
  }),
  t.partial({
    /** comment id to clear notification upon seeing */
    c: t.string,
  })
]);
export type NotificationT = t.TypeOf<typeof NotificationV>;
