## [crosshare.org](https://crosshare.org)

[![Twitter](https://img.shields.io/twitter/follow/crosshareapp?style=social)](https://twitter.com/crosshareapp)

Crosshare is a free community for crossword constructors and solvers. Crosshare is written in TypeScript using Next.js, React, and firebase.

Use [GitHub issues](https://github.com/mdirolf/crosshare/issues) for bug reports and feature requests.

## Developing Locally

### Set up a new firebase project

Visit http://console.firebase.google.com/, click "add project". Use whatever name you'd like. You don't need to enable google analytics.

#### Set up authentication

Click "Authentication" in the side bar. Click "Get started". Click on the "Google" sign-in provider and toggle to "Enabled". Use anything you like for public facing name and enter your email as the project support email. Click "Save".

#### Set up the database

Click "Firestore Database" in the side bar. Click "Create database". Choose "start in production mode" and any storage location.

#### Download credentials

Click the little gear icon in the side bar. Scroll to the "Your apps" section and click "</>" to create a web app. Register an app using whatever name you'd like. You don't need to set up hosting. 

Copy the `var firebaseConfig = {...}` lines from the Add Firebase SDK dialog that pops up and paste them into a new file at `app/firebaseConfig.ts`. Change `var firebaseConfig` to `export const firebaseConfig`. These are the credentials used by the Crosshare frontend.

New click "Service Accounts" at the top of the Project Settings page. Under "Firebase Admin SDK" click "Generate new private key". Save the resultant file as `serviceAccountKey.json` in the root of this repository. This is the credential file for the Crosshare server.

### Install dependencies

Crosshare is currently deployed on node 12 - on Fedora it's:
```shell
$ sudo dnf module install nodejs:12
```

We use `yarn` for package management:
```shell
$ sudo npm install --global yarn
```

Install dependencies:
```shell
$ cd app
$ yarn
```

### Now you can run crosshare locally

While still in the `app/` directory, connect to your firebase project:
```shell
$ npx firebase use --add
```

Now deploy the firestore rules and indexes:
```shell
$ npx firebase deploy --only firestore
```

Bootstrap some data that the app depends on:
```shell
$ GOOGLE_APPLICATION_CREDENTIALS=../serviceAccountKey.json ./scripts/bootstrapDatabase.ts
```

Then start the server:
```shell
$ yarn dev
```

## Credits

See the [contributors](https://github.com/mdirolf/crosshare/graphs/contributors) on this repository and [crosshare.org/donate](https://crosshare.org/donate).

## License

Crosshare is licensed under the GNU Affero General Public License 3.
