import { differenceInDays } from 'date-fns';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { Button } from '../components/Buttons';
import { ContactLinks } from '../components/ContactLinks';
import { PatronIcon } from '../components/Icons';
import { DefaultTopBar } from '../components/TopBar';
import { DonationsListV, donationsByEmail } from '../lib/dbtypes';
import { getCollection } from '../lib/firebaseAdminWrapper';
import { withTranslation } from '../lib/translation';
import { clsx } from '../lib/utils';
import styles from './donate.module.css';

interface DonateProps {
  donors: {
    name: string | null;
    page: string | null;
    above100: boolean;
    date: number;
  }[];
}

const gssp: GetServerSideProps<DonateProps> = async ({ res }) => {
  return getCollection('donations')
    .doc('donations')
    .get()
    .then((result) => {
      const validationResult = DonationsListV.decode(result.data());
      if (isRight(validationResult)) {
        res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
        const groupedByEmail = donationsByEmail(validationResult.right);
        return {
          props: {
            donors: Array.from(groupedByEmail.values())
              .map((v) => ({
                name: v.name,
                page: v.page,
                above100: v.total >= 100,
                date: v.date.getTime(),
              }))
              .filter((v) => v.name)
              .sort((a, b) => a.name?.localeCompare(b.name ?? '') ?? 0),
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
  const now = new Date();
  return (
    <>
      <Head>
        <title>{`Donate and Become a Crosshare Patron`}</title>
      </Head>
      <DefaultTopBar />
      <div className={styles.page}>
        <PatronIcon className={styles.patronHeader} />
        <div className={styles.bannerWrap}>
          <div className={styles.tag}>
            A free crossword community for everyone
          </div>
          <div className={styles.subtitle}>
            Crosshare is <b>free</b> and <b>ad-free</b>, but it isn&apos;t free
            to run. We rely on support from people like you to make it possible.
          </div>
        </div>
        <PatronIcon className={styles.patronHeader} />
      </div>
      <div className={styles.text}>
        <h2 className="textAlignCenter">Become a Crosshare Patron</h2>
        <p>
          Crosshare is developed by a <b>very</b> small team of volunteers.
          Every donation, no matter how small, makes a huge difference towards
          keeping this project alive.
        </p>
        <p>
          Monthly recurring donations are especially helpful, as they allow us
          to plan for ever increasing server costs from new users and new
          features. To encourage recurring donations, we&apos;ve added a new
          patron icon - <PatronIcon /> - which lasts one month from the time of
          your last donation. Please consider making a recurring donation and
          becoming a Crosshare patron!
        </p>
        <form
          className={styles.paypalForm}
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
        <p className="marginTop1-5em">
          We also accept donations via Zelle. Zelle is great because 100% of
          your donation goes to Crosshare! Please send your donation to{' '}
          <b>mike@crosshare.org</b>. Be sure to follow up with an email so we
          know which account to give a patron icon to and how you&apos;d like to
          be listed on the contributors list!
        </p>
        <p className="textAlignCenter">
          <i>
            If you&apos;d like to donate but not via paypal/zelle, please
            contact us via <ContactLinks />.
          </i>
        </p>
      </div>
      <h2 className="textAlignCenter">
        The contributors who make Crosshare possible
      </h2>
      <p></p>
      <ul className={styles.list}>
        {donors.map((d, i) => (
          <li key={i} className={clsx(d.above100 && styles.bold)}>
            {differenceInDays(now, new Date(d.date)) <= 32 ? (
              <PatronIcon className="marginRight0-5em" />
            ) : (
              ''
            )}
            {d.page ? <a href={`/${d.page}`}>{d.name}</a> : d.name}
          </li>
        ))}
      </ul>
      <div className={styles.exp}>
        Contributors who have totaled $100 or more are in bold
      </div>
    </>
  );
}
