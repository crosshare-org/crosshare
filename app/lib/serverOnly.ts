import { ParsedUrlQuery } from 'querystring';
import { addDays } from 'date-fns';
import type firebaseAdminType from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { Root } from 'hast';
import { GetServerSideProps } from 'next';
import { NextPuzzleLink } from '../components/Puzzle.js';
import {
  ConstructorPageBarebones,
  ConstructorPageWithMarkdown,
  validate as validateCP,
} from '../lib/constructorPage.js';
import { getAdminApp, getCollection } from '../lib/firebaseAdminWrapper.js';
import { ArticleT, validate } from './article.js';
import {
  CommentWithRepliesT,
  DBPuzzleT,
  DBPuzzleV,
  getDateString,
  prettifyDateString,
} from './dbtypes.js';
import {
  EmbedOptionsT,
  validate as validateEmbedOptions,
} from './embedOptions.js';
import { markdownToHast } from './markdown/markdown.js';
import { PackV } from './pack.js';
import { PathReporter } from './pathReporter.js';
import { isUserMod, isUserPatron } from './patron.js';
import { AccountPrefsV } from './prefs.js';
import {
  Comment,
  Direction,
  PuzzleResultWithAugmentedComments,
  puzzleFromDB,
} from './types.js';
import { allSolutions, slugify } from './utils.js';
import { addClues, fromCells, getEntryToClueMap } from './viewableGrid.js';

export async function getStorageUrl(
  storageKey: string
): Promise<string | null> {
  const profilePic = getStorage(getAdminApp()).bucket().file(storageKey);
  if ((await profilePic.exists())[0]) {
    try {
      if (process.env.NEXT_PUBLIC_USE_EMULATORS) {
        return profilePic.publicUrl();
      }
      return (
        await profilePic.getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
        })
      )[0];
    } catch (e) {
      console.log('error getting profile pic', storageKey, e);
    }
  } else {
    console.log('pic doesnt exist', storageKey);
  }
  return null;
}

const usernameMap: Record<
  string,
  [number, ConstructorPageWithMarkdown | null]
> = {};
const usernamesTTL = 1000 * 60 * 30;

const updateUsernameMap = async (
  userid: string
): Promise<ConstructorPageWithMarkdown | null> => {
  console.log('updating username map', userid);
  const now = Date.now();
  const db = getFirestore(getAdminApp());
  let dbres;
  try {
    dbres = await db.collection('cp').where('u', '==', userid).limit(1).get();
  } catch {
    throw new Error(`error getting cp for ${userid}`);
  }
  const cp = validateCP(dbres.docs[0]?.data(), dbres.docs[0]?.id || '');
  if (!cp) {
    usernameMap[userid] = [now, null];
    return null;
  }
  const { sig, ...rest } = {
    ...cp,
    b: markdownToHast({ text: cp.b }),
  };
  const ret = {
    ...rest,
    ...(sig !== undefined && { sig: markdownToHast({ text: sig }) }),
  };
  usernameMap[userid] = [now, ret];
  return ret;
};

async function userIdToFullPage(
  userId: string
): Promise<ConstructorPageWithMarkdown | null> {
  const existing = usernameMap[userId];
  if (existing && Date.now() - existing[0] < usernamesTTL) return existing[1];
  return updateUsernameMap(userId);
}

export async function userIdToPage(
  userId: string
): Promise<ConstructorPageBarebones | null> {
  const existing = usernameMap[userId];
  if (existing && Date.now() - existing[0] < usernamesTTL) return existing[1];
  return updateUsernameMap(userId);
}

export async function userIdToConstructorPageWithPatron(
  id: string
): Promise<(ConstructorPageBarebones & { isPatron: boolean }) | null> {
  const page = await userIdToPage(id);
  if (!page) {
    return null;
  }
  const isPatron = await isUserPatron(id);
  return { ...page, isPatron };
}

export async function getArticle(
  slug: string
): Promise<string | ArticleT | null> {
  const db = getFirestore(getAdminApp());
  let dbres;
  try {
    dbres = await db.collection('a').where('s', '==', slug).get();
  } catch {
    return 'error getting article';
  }
  return validate(dbres.docs[0]?.data());
}

export async function getWeeklyEmailsFromYear(
  year: number
): Promise<ArticleT[] | string> {
  const db = getFirestore(getAdminApp());
  let dbres;
  try {
    // Assumes weekly email articles' slugs always start with weekly-email-year
    // https://stackoverflow.com/a/56815787/18270160
    dbres = await db
      .collection('a')
      .where('s', '>=', `weekly-email-${year}`)
      .where('s', '<=', `weekly-email-${year}\uf8ff`)
      .orderBy('s', 'desc')
      .get();
  } catch {
    return 'Error getting articles from ' + year;
  }

  const articles: ArticleT[] = [];
  for (const doc of dbres.docs) {
    const validated = validate(doc.data());
    if (validated) {
      articles.push(validated);
    }
  }
  return articles;
}

export async function getPreviousArticle(
  slug: string
): Promise<string | ArticleT | null> {
  const db = getFirestore(getAdminApp());
  let dbres;
  try {
    dbres = await db
      .collection('a')
      .where('s', '<', slug)
      .orderBy('s', 'desc')
      .limit(1)
      .get();
  } catch {
    return 'error getting article';
  }
  return validate(dbres.docs[0]?.data());
}

async function getNextArticle(slug: string): Promise<string | ArticleT | null> {
  const db = getFirestore(getAdminApp());
  let dbres;
  try {
    dbres = await db
      .collection('a')
      .where('s', '>', slug)
      .orderBy('s', 'asc')
      .limit(1)
      .get();
  } catch {
    return 'error getting article';
  }
  return validate(dbres.docs[0]?.data());
}

export interface WeeklyEmailPageProps {
  weeklyYear?: number;
  nextSlug?: string;
  prevSlug?: string;
}

export type ArticlePageProps = ArticleT &
  WeeklyEmailPageProps & {
    hast: Root;
  };

export function maxWeeklyEmailArticle() {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() - 3);
  return `weekly-email-${maxDate.toISOString().split('T')[0]}`;
}

export const getArticlePageProps: GetServerSideProps<
  ArticlePageProps
> = async ({ res, params }) => {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!params?.slug || Array.isArray(params.slug)) {
    return { notFound: true };
  }
  const article = await getArticle(params.slug);
  if (typeof article === 'string') {
    return { notFound: true };
  }
  if (!article) {
    res.statusCode = 404;
    return { notFound: true };
  }
  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');

  const weeklyEmailProps: WeeklyEmailPageProps = {};
  if (params.slug.startsWith('weekly-email-')) {
    const prev = await getPreviousArticle(params.slug);
    if (
      prev !== null &&
      typeof prev !== 'string' &&
      prev.s.startsWith('weekly-email-')
    ) {
      weeklyEmailProps.prevSlug = prev.s;
    }

    const next = await getNextArticle(params.slug);
    if (
      next !== null &&
      typeof next !== 'string' &&
      next.s.startsWith('weekly-email-') &&
      next.s < maxWeeklyEmailArticle()
    ) {
      weeklyEmailProps.nextSlug = next.s;
    }

    const yearFromSlug = /weekly-email-([0-9]+)/.exec(params.slug);
    if (yearFromSlug?.[1]) {
      weeklyEmailProps.weeklyYear = parseInt(yearFromSlug[1]);
    }
  }

  return {
    props: {
      ...article,
      ...weeklyEmailProps,
      hast: markdownToHast({ text: article.c }),
    },
  };
};

// TODO this is identical to the function in `Comments.tsx` but operates on a different format of Comment - unify if possible
export function filterDeletedComments(
  comments: CommentWithRepliesT[]
): CommentWithRepliesT[] {
  return comments
    .map(
      // First do the recursion on any children
      (c: CommentWithRepliesT): CommentWithRepliesT => ({
        ...c,
        r: filterDeletedComments(c.r || []),
      })
    )
    .map((c) => {
      if (!c.r?.length) {
        delete c.r;
        return c;
      } else {
        // Not childless, so change comment text if it's deleted
        return {
          ...c,
          c: c.deleted
            ? c.removed
              ? '*Comment removed*'
              : '*Comment deleted*'
            : c.c,
        };
      }
    })
    .filter((x) => (x.r !== undefined && x.r.length > 0) || !x.deleted); // Remove any childless deleted comments
}

async function convertComments(
  comments: CommentWithRepliesT[],
  clueMap: Map<string, [number, Direction, string]>
): Promise<Comment[]> {
  return Promise.all(
    filterDeletedComments(comments).map(async (c) => {
      return {
        commentText: c.c,
        commentHast: markdownToHast({ text: c.c, clueMap }),
        authorId: c.a,
        authorDisplayName: c.n,
        authorSolveTime: c.t,
        authorCheated: c.ch,
        authorSolvedDownsOnly: c.do || false,
        publishTime: c.p.toMillis(),
        id: c.i,
        replies: await convertComments(c.r || [], clueMap),
        ...(c.un && { authorUsername: c.un }),
        authorIsPatron: await isUserPatron(c.a),
        authorIsMod: await isUserMod(c.a),
        ...(c.deleted && { deleted: true }),
        ...(c.removed && { removed: true }),
      };
    })
  );
}

export interface PuzzlePageResultProps {
  puzzle: PuzzleResultWithAugmentedComments;
  profilePicture?: string | null;
  coverImage?: string | null;
  nextPuzzle?: NextPuzzleLink;
  embedOptions?: EmbedOptionsT;
}

export type PuzzlePageProps = PuzzlePageResultProps | { packId: string };

async function getPrefs(
  db: firebaseAdminType.firestore.Firestore,
  uid: string
) {
  const dbres = await db.collection('prefs').doc(uid).get();
  if (!dbres.exists) {
    return null;
  }

  const validationResult = AccountPrefsV.decode(dbres.data());
  if (validationResult._tag !== 'Right') {
    console.error(
      'error decoding prefs',
      uid,
      PathReporter.report(validationResult).join(',')
    );
    return null;
  }
  return validationResult.right;
}

async function getPack(
  db: firebaseAdminType.firestore.Firestore,
  packId: string
) {
  const dbres = await db.collection('packs').doc(packId).get();
  if (!dbres.exists) {
    return null;
  }

  const validationResult = PackV.decode(dbres.data());
  if (validationResult._tag !== 'Right') {
    console.error(
      'error decoding pack',
      packId,
      PathReporter.report(validationResult).join(',')
    );
    return null;
  }
  return validationResult.right;
}

async function hasPackAccess(
  db: firebaseAdminType.firestore.Firestore,
  token: string,
  packId: string
) {
  const claims = await getAuth(getAdminApp()).verifyIdToken(token);

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (claims.admin) {
    return true;
  }

  const uid = claims.uid;
  const prefs = await getPrefs(db, uid);
  if (prefs?.packs?.includes(packId)) {
    return true;
  }

  const pack = await getPack(db, packId);
  if (pack?.a.includes(uid)) {
    return true;
  }

  return false;
}

export const getPuzzlePageProps: GetServerSideProps<PuzzlePageProps> = async ({
  res,
  params,
  locale,
  query,
}) => {
  const db = getFirestore(getAdminApp());
  let puzzleId = params?.puzzleId;
  let titleSlug = '';
  if (Array.isArray(puzzleId)) {
    titleSlug = puzzleId[1] || '';
    puzzleId = puzzleId[0];
  }
  if (!puzzleId) {
    return { notFound: true };
  }
  const dbres = await db.collection('c').doc(puzzleId).get();
  if (!dbres.exists) {
    return { notFound: true };
  }

  const validationResult = DBPuzzleV.decode(dbres.data());
  if (validationResult._tag !== 'Right') {
    console.error(PathReporter.report(validationResult).join(','));
    throw new Error(`invalid puzzle ${puzzleId}`);
  }

  if (validationResult.right.pk) {
    const token = query.token;
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!token || Array.isArray(token)) {
      return { props: { packId: validationResult.right.pk } };
    }
    try {
      if (!(await hasPackAccess(db, token, validationResult.right.pk))) {
        return {
          redirect: {
            destination: `/${
              locale && locale !== 'en' ? locale + '/' : ''
            }packs/${validationResult.right.pk}`,
            permanent: false,
          },
        };
      }
    } catch {
      return { props: { packId: validationResult.right.pk } };
    }
  }

  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');

  const fromDB = puzzleFromDB(validationResult.right, puzzleId);
  const grid = addClues(
    fromCells({
      mapper: (e) => e,
      width: fromDB.size.cols,
      height: fromDB.size.rows,
      cells: fromDB.grid,
      allowBlockEditing: true,
      cellStyles: new Map<string, Set<number>>(
        Object.entries(fromDB.cellStyles).map(([k, v]) => [k, new Set(v)])
      ),
      vBars: new Set(fromDB.vBars),
      hBars: new Set(fromDB.hBars),
      hidden: new Set(fromDB.hidden),
    }),
    fromDB.clues,
    (c: string) => markdownToHast({ text: c, inline: true })
  );
  const clueMap = getEntryToClueMap(
    grid,
    allSolutions(fromDB.grid, fromDB.alternateSolutions)[0]
  );
  const puzzle: PuzzleResultWithAugmentedComments = {
    ...fromDB,
    id: dbres.id,
    blogPostRaw: fromDB.blogPost,
    blogPost: fromDB.blogPost
      ? markdownToHast({ text: fromDB.blogPost })
      : null,
    constructorNotes: fromDB.constructorNotes
      ? markdownToHast({ text: fromDB.constructorNotes, inline: true })
      : null,
    constructorPage: await userIdToFullPage(validationResult.right.a),
    constructorIsPatron: await isUserPatron(validationResult.right.a),
    constructorIsMod: await isUserMod(validationResult.right.a),
    comments: await convertComments(fromDB.comments, clueMap),
    clueHasts: grid.entries.map((c) =>
      markdownToHast({ text: c.clue, clueMap, inline: true })
    ),
    likes: Object.fromEntries(
      await Promise.all(
        fromDB.likes.map(
          async (
            k: string
          ): Promise<
            [string, (ConstructorPageBarebones & { isPatron: boolean }) | null]
          > => [k, await userIdToConstructorPageWithPatron(k)]
        )
      )
    ),
  };

  // If the title slug is missing or not correct we need to redirect
  const correctSlug = slugify(puzzle.title);
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!params?.ignoreRedirect && titleSlug !== correctSlug) {
    return {
      redirect: {
        destination: `/${
          locale && locale !== 'en' ? locale + '/' : ''
        }crosswords/${puzzle.id}/${correctSlug}`,
        permanent: true,
      },
    };
  }

  let profilePicture: string | null = null;
  let coverImage: string | null = null;
  if (puzzle.constructorPage?.u) {
    profilePicture = await getStorageUrl(
      `users/${puzzle.constructorPage.u}/profile.jpg`
    );
  }
  coverImage = await getStorageUrl(
    `users/${puzzle.authorId}/${puzzle.id}/cover.jpg`
  );

  let nextPuzzle: NextPuzzleLink | null = null;
  const today = new Date();

  if (validationResult.right.dmd) {
    // this puzzle is a daily mini, see if we show a previous instead of today's
    const dt = new Date(validationResult.right.dmd);
    let tryMiniDate = new Date(
      dt.valueOf() - dt.getTimezoneOffset() * 60 * 1000
    );
    if (tryMiniDate <= today) {
      tryMiniDate = addDays(tryMiniDate, -1);
      const puzzle = await getMiniForDate(tryMiniDate);
      if (puzzle !== null) {
        nextPuzzle = {
          puzzleId: puzzle.id,
          linkText: 'the previous daily mini crossword',
          puzzleTitle: puzzle.t,
        };
      }
    }
  }

  if (!nextPuzzle) {
    const puzzle = await getMiniForDate(today);
    if (puzzle !== null) {
      nextPuzzle = {
        puzzleId: puzzle.id,
        linkText: "today's daily mini crossword",
        puzzleTitle: puzzle.t,
      };
    }
  }
  return {
    props: {
      puzzle,
      profilePicture,
      coverImage,
      ...(nextPuzzle && {
        nextPuzzle,
      }),
    },
  };
};

export const getEmbedProps = async ({
  params,
  query,
}: {
  params?: ParsedUrlQuery;
  query: ParsedUrlQuery;
}): Promise<EmbedOptionsT> => {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!params?.userId || Array.isArray(params.userId)) {
    return {};
  }

  const embedOptionsRes = await getCollection('em').doc(params.userId).get();
  let embedOptions = validateEmbedOptions(embedOptionsRes.data());
  if (!embedOptions) {
    embedOptions = {};
  }
  if (query['color-mode'] === 'dark') {
    embedOptions.d = true;
  }
  if (query['color-mode'] === 'light') {
    embedOptions.d = false;
  }
  return embedOptions;
};

/* Get a daily mini using the firebase-admin library.
 * The similarly named function in dailyMinis.ts gets used client-side only.  */
export async function getMiniForDate(
  d: Date
): Promise<(DBPuzzleT & { id: string }) | null> {
  const dbres = await getCollection('c')
    .where('dmd', '==', prettifyDateString(getDateString(d)))
    .limit(1)
    .get();

  const doc = dbres.docs[0];
  if (!doc) {
    console.error('no dm for date ', d);
    return null;
  }
  const validationResult = DBPuzzleV.decode(doc.data());
  if (validationResult._tag === 'Right') {
    return { ...validationResult.right, id: doc.id };
  }
  console.error('invalid puzzle ', doc.id);
  console.error(PathReporter.report(validationResult).join(','));
  return null;
}
