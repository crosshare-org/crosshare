import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';

const EmbedOptionsV = t.partial({
  /** primary color */
  p: t.string,
  /** link color */
  l: t.string,
  /** error color */
  e: t.string,
  /** verified color */
  v: t.string,
  /** use dark theme? */
  d: t.boolean,
  /** don't transform colors for dark theme? */
  pp: t.boolean,
  /** custom font url */
  fu: t.string,
  /** custom font url (bold) */
  fub: t.string,
  /** custom font url (italic) */
  fui: t.string,
  /** custom font url (bold + italic) */
  fubi: t.string,
  /** use slate custom UI */
  slate: t.boolean,
});

export type EmbedOptionsT = t.TypeOf<typeof EmbedOptionsV>;

export function validate(eo: unknown): EmbedOptionsT | null {
  const validationResult = EmbedOptionsV.decode(eo);
  if (validationResult._tag === 'Right') {
    return validationResult.right;
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return null;
  }
}
