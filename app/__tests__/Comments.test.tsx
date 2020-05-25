import { Comments } from "../components/Comments";
import { anonymousUser, render } from "../lib/testingUtils";
import { Comment } from "../lib/types";
import * as firebaseTesting from "@firebase/testing";

jest.mock("../lib/firebaseWrapper");

const testComments: Array<Comment> = [
  {
    id: "comment-id",
    commentText: "my first comment",
    authorId: "comment-author-id",
    authorDisplayName: "Mike D",
    authorSolveTime: 55.4,
    authorCheated: false,
    publishTime: new Date().getTime(),
  },
];

test("basic comment display", () => {
  const { getByText, container } = render(
    <Comments
      solveTime={10}
      didCheat={false}
      puzzleId="puzz"
      puzzleAuthorId="puzzAuthor"
      user={anonymousUser}
      comments={testComments}
    />
  );
  expect(getByText(/my first comment/i)).toBeVisible();
  expect(container.firstChild).toMatchInlineSnapshot(`
    .emotion-5 {
      margin-top: 1em;
    }

    .emotion-0 {
      border-bottom: 1px solid var(--black);
    }

    .emotion-4 {
      list-style-type: none;
      margin: 2em 0 0 0;
      padding: 0;
    }

    .emotion-3 {
      margin-top: 1em;
    }

    .emotion-1 {
      vertical-align: text-bottom;
    }

    .emotion-2 {
      font-size: 0.75em;
      background-color: var(--caption);
      color: white;
      border-radius: 5px;
      padding: 0.1em 0.2em;
    }

    <div
      class="emotion-5"
    >
      <h4
        class="emotion-0"
      >
        Comments
      </h4>
      <div>
        Sign in with google (above) to leave a comment of your own
      </div>
      <ul
        class="emotion-4"
      >
        <li>
          <div
            class="emotion-3"
          >
            <div>
              <span
                class="emotion-1"
              >
                <svg
                  fill="rgb(25,42,230)"
                  height="1em"
                  shape-rendering="crispEdges"
                  viewBox="0 0 5 5"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    fill="rgba(140,140,140,0.2)"
                    height="100%"
                    width="100%"
                  />
                  <rect
                    height="1"
                    width="1"
                    x="2"
                    y="0"
                  />
                  <rect
                    height="1"
                    width="1"
                    x="2"
                    y="1"
                  />
                  <rect
                    height="1"
                    width="1"
                    x="2"
                    y="3"
                  />
                  <rect
                    height="1"
                    width="1"
                    x="1"
                    y="0"
                  />
                  <rect
                    height="1"
                    width="1"
                    x="3"
                    y="0"
                  />
                  <rect
                    height="1"
                    width="1"
                    x="1"
                    y="1"
                  />
                  <rect
                    height="1"
                    width="1"
                    x="3"
                    y="1"
                  />
                  <rect
                    height="1"
                    width="1"
                    x="1"
                    y="3"
                  />
                  <rect
                    height="1"
                    width="1"
                    x="3"
                    y="3"
                  />
                  <rect
                    height="1"
                    width="1"
                    x="0"
                    y="0"
                  />
                  <rect
                    height="1"
                    width="1"
                    x="4"
                    y="0"
                  />
                  <rect
                    height="1"
                    width="1"
                    x="0"
                    y="2"
                  />
                  <rect
                    height="1"
                    width="1"
                    x="4"
                    y="2"
                  />
                  <rect
                    height="1"
                    width="1"
                    x="0"
                    y="4"
                  />
                  <rect
                    height="1"
                    width="1"
                    x="4"
                    y="4"
                  />
                </svg>
              </span>
              <i>
                 
                Mike D
                 
              </i>
              <span
                aria-label="Solved without helpers"
                role="img"
                title="Solved without helpers"
              >
                🤓
              </span>
              <span
                class="emotion-2"
              >
                55s
              </span>
            </div>
            <div>
              my first comment
            </div>
            
            
          </div>
        </li>
      </ul>
    </div>
  `);
});

test("security rules should only allow commenting as onesself", async () => {
  var app = firebaseTesting.initializeTestApp({
    projectId: "mdcrosshare",
    auth: {
      uid: "mike",
      admin: false,
      firebase: {
        sign_in_provider: "google.com",
      },
    },
  });

  await firebaseTesting.assertFails(
    app.firestore().collection("cfm").add({ c: "comment text" })
  );
  await firebaseTesting.assertFails(
    app.firestore().collection("cfm").add({ c: "comment text", a: "jared" })
  );
  await firebaseTesting.assertSucceeds(
    app.firestore().collection("cfm").add({ c: "comment text", a: "mike" })
  );
  app.delete();
});

test("security rules should only allow commenting if non-anonymous", async () => {
  var app = firebaseTesting.initializeTestApp({
    projectId: "mdcrosshare",
    auth: {
      uid: "mike",
      admin: false,
      firebase: {
        sign_in_provider: "anonymous",
      },
    },
  });

  await firebaseTesting.assertFails(
    app.firestore().collection("cfm").add({ c: "comment text" })
  );
  await firebaseTesting.assertFails(
    app.firestore().collection("cfm").add({ c: "comment text", a: "jared" })
  );
  await firebaseTesting.assertFails(
    app.firestore().collection("cfm").add({ c: "comment text", a: "mike" })
  );
  app.delete();
});
