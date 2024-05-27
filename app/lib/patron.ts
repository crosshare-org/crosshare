import { getAuth } from 'firebase-admin/auth';
import { ConstructorPageV } from './constructorPage.js';
import { DonationsListV, donationsByEmail } from './dbtypes.js';
import { getAdminApp, getCollection } from './firebaseAdminWrapper.js';
import { PathReporter } from './pathReporter.js';

let patronList: string[] | null = null;
let lastUpdated: number | null = null;

const getPatronList = async (): Promise<string[]> => {
  console.log('updating patron list');
  const donations = await getCollection('donations').doc('donations').get();
  const validationResult = DonationsListV.decode(donations.data());
  if (validationResult._tag !== 'Right') {
    console.error(PathReporter.report(validationResult).join(','));
    throw new Error('Malformed donations list');
  }
  const now = Date.now();
  lastUpdated = now;

  const byEmail = donationsByEmail(validationResult.right);
  const recents = Array.from(byEmail.entries()).filter(([_email, row]) => {
    return now - row.date.getTime() <= 32 * 24 * 60 * 60 * 1000;
  });
  const auth = getAuth(getAdminApp());
  const userIds = await Promise.allSettled(
    recents.map(async ([email, row]) => {
      if (row.userId) {
        // First use explicit userid if set.
        return row.userId;
      } else if (row.page) {
        // If we have a page, get the userId from that.
        const res = await getCollection('cp').doc(row.page.toLowerCase()).get();
        const val = ConstructorPageV.decode(res.data());
        if (val._tag === 'Right') {
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

let patronListPromise: Promise<string[]> | null = null;
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
  return patronList.includes(userId) || false;
};
