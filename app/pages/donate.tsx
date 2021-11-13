import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { Button } from '../components/Buttons';
import { ContactLinks } from '../components/ContactLinks';
import { Emoji } from '../components/Emoji';
import { DefaultTopBar } from '../components/TopBar';
import { AdminApp } from '../lib/firebaseWrapper';
import * as t from 'io-ts';
import { timestamp } from '../lib/timestamp';
import { withTranslation } from '../lib/translation';

interface DonateProps {
  donors: Array<{
    name: string | null;
    page: string | null;
    above100: boolean;
  }>;
}

const DonationsListV = t.type({
  d: t.array(
    t.type({
      /** email */
      e: t.string,
      /** date */
      d: timestamp,
      /** donated amount */
      a: t.number,
      /** received amount */
      r: t.number,
      /** name */
      n: t.union([t.string, t.null]),
      /** page */
      p: t.union([t.string, t.null]),
    })
  ),
});
export type DonationsListT = t.TypeOf<typeof DonationsListV>;

const gssp: GetServerSideProps<DonateProps> = async ({
  res,
}) => {
  const db = AdminApp.firestore();

  return db
    .doc('donations/donations')
    .get()
    .then(async (result) => {
      const data = result.data();
      const validationResult = DonationsListV.decode(data);
      if (isRight(validationResult)) {
        res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
        const groupedByEmail = validationResult.right.d.reduce(
          (
            acc: Map<
              string,
              { name: string | null; page: string | null; total: number }
            >,
            val
          ) => {
            const prev = acc.get(val.e);
            if (prev) {
              acc.set(val.e, {
                name: val.n || prev.name,
                page: val.p || prev.page,
                total: val.a + prev.total,
              });
            } else {
              acc.set(val.e, {
                name: val.n || null,
                page: val.p || null,
                total: val.a,
              });
            }
            return acc;
          },
          new Map()
        );
        return {
          props: {
            donors: Array.from(groupedByEmail.values())
              .map((v) => ({
                name: v.name,
                page: v.page,
                above100: v.total >= 100,
              }))
              .filter((v) => v.name)
              .sort((a, b) => a.name?.localeCompare(b.name || '') || 0),
          },
        };
      } else {
        console.error(PathReporter.report(validationResult).join(','));
        throw new Error('Malformed donations list');
      }
    });
};

export const getServerSideProps = withTranslation(gssp);

export default function DonatePage({ donors }: DonateProps) {
  return (
    <>
      <Head>
        <title>Donate | Crosshare Crossword Constructor and Puzzles</title>
      </Head>
      <DefaultTopBar />
      <div css={{ margin: '1em' }}>
        <h2>Contribute to Crosshare</h2>
        <p>
          Crosshare will always be <b>free</b> and <b>ad-free</b>. Your donation
          supports the continued development and hosting costs associated with
          running the site. Thank you!
        </p>
        <form
          css={{ marginBottom: '1.5em' }}
          action="https://www.paypal.com/donate"
          method="post"
          target="_top"
        >
          <input type="hidden" name="business" value="FTAE6AJHUAJ42" />
          <input
            type="hidden"
            name="item_name"
            value="All donations support crosshare.org"
          />
          <input type="hidden" name="currency_code" value="USD" />
          <Button type="submit" text="Donate (via credit card / paypal)" />
        </form>
        <p>
          We&apos;ll add your name to the list below - please comment with your
          donation if you&apos;d like to remain anonymous or use a specific
          name/message. Include your Crosshare username if you&apos;d like us to
          link to your page.
        </p>
        <p>
          <i>
            If you&apos;d like to donate but not via paypal, please contact us
            via <ContactLinks />.
          </i>
        </p>
        <p>
          Crosshare is run as a non-profit, but is not officially a 501c3 (yet).
          If you&apos;re able and willing to help us through the process of
          registering as a non-profit please get in touch!
        </p>
        <h2>
          Our Contributors <Emoji symbol="🥰" />
        </h2>
        <p>
          <i>Contributors who have totaled $100 or more are in bold</i>
        </p>
        <ul>
          {donors.map((d, i) => (
            <li key={i} css={{ fontWeight: d.above100 ? 'bold' : 'normal' }}>
              {d.page ? <a href={`/${d.page}`}>{d.name}</a> : d.name}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
