import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { ConstructorPageV } from './constructorPage';
import { donationsByEmail, DonationsListV } from './dbtypes';
import { AdminApp } from './firebaseAdminWrapper';

let patronList: Array<string> | null = null;
let lastUpdated: number | null = null;

const getPatronList = async (): Promise<Array<string>> => {
  console.log('updating patron list');
  const db = getFirestore(AdminApp);
  const donations = await db
    .doc('donations/donations')
    .get()
    .then(async (result) => {
      const data = result.data();
      const validationResult = DonationsListV.decode(data);
      if (isRight(validationResult)) {
        return validationResult.right;
      } else {
        console.error(PathReporter.report(validationResult).join(','));
        throw new Error('Malformed donations list');
      }
    });
  const now = Date.now();
  lastUpdated = now;

  const byEmail = donationsByEmail(donations);
  const recents = Array.from(byEmail.entries()).filter(([_email, row]) => {
    return now - row.date.getTime() <= 32 * 24 * 60 * 60 * 1000;
  });
  const auth = getAuth(AdminApp);
  const userIds = await Promise.allSettled(
    recents.map(async ([email, row]) => {
      if (row.userId) {
        // First use explicit userid if set.
        return row.userId;
      } else if (row.page) {
        // If we have a page, get the userId from that.
        const res = await db.doc(`cp/${row.page.toLowerCase()}`).get();
        const val = ConstructorPageV.decode(res.data());
        if (isRight(val)) {
          return val.right.u;
        } else {
          const error = `Malformed constructor page for ${row.page}`;
          console.log(error);
          console.error(PathReporter.report(val).join(','));
          throw new Error(error);
        }
      } else {
        // Otherwise get by email
        const u = await auth.getUserByEmail(email);
        return u.uid;
      }
    })
  );
  return userIds
    .map((res) => (res.status === 'fulfilled' ? res.value : ''))
    .filter((n) => n);
};

let patronListPromise: Promise<Array<string>> | null = null;
const getPatronListOnce = () => {
  if (!patronListPromise) {
    patronListPromise = getPatronList().finally(() => {
      patronListPromise = null;
    });
  }
  return patronListPromise;
};

export const isUserPatron = async (userId: string) => {
  if (
    patronList === null ||
    !lastUpdated ||
    Date.now() - lastUpdated > 60 * 60 * 1000
  ) {
    patronList = await getPatronListOnce();
  }
  return patronList?.includes(userId) || false;
};
