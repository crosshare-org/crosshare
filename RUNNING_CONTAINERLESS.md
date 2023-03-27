Note: the recommended way to run Crosshare locally is to use the container-based dev workflow outlined in the [README](/README.md).

#### Windows

Most of these instructions are written for unix-like OSes - folks have had success using [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/about) to follow them on Windows, though.

### Set up a new firebase project

Visit http://console.firebase.google.com/, click "add project" or "create a project". Use whatever name you'd like. You don't need to enable google analytics.

#### Set up authentication

Click "Build" in the side bar, then "Authentication". Click "Get started". Click on the "Google" sign-in provider and toggle to "Enabled". Use anything you like for public facing name and enter your email as the project support email. Click "Save".

#### Set up the database

Click "Firestore Database" in the side bar. Click "Create database". Choose "start in production mode" and any storage location.

#### Download credentials

Click the little gear icon in the side bar and select "Project settings". Scroll to the "Your apps" section and click "</>" to create a web app. Register an app using whatever name you'd like. You don't need to set up hosting. 

Copy the `const firebaseConfig = {...}` lines from the Add Firebase SDK dialog that pops up and paste them into a new file at `app/firebaseConfig.ts`. Change `const firebaseConfig` to `export const firebaseConfig`. These are the credentials used by the Crosshare frontend.

Now click "Continue to console" and click "Service accounts" at the top of the Project Settings page. Under "Firebase Admin SDK" click "Generate new private key". Save the resultant file as `serviceAccountKey.json` in the root of this repository. This is the credential file for the Crosshare server.

### Install dependencies

Crosshare is currently deployed on node 18 - on Fedora it's:

```shell
$ sudo dnf module install nodejs:18
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
$ npx firebase login
$ npx firebase use --add
```

Now deploy the firestore rules and indexes:
```shell
$ npx firebase deploy --only firestore
```

Compile the i18n definitions:
```shell
$ yarn compileI18n
```

Then start the server:
```shell
$ yarn dev
```

You should now be able to view Crosshare locally at http://localhost:3000

Note: The indexes you created with `firebase deploy --only firestore` can take a while to finish building. You might get related errors when viewing the site until they are done.

#### Wordlists

When running the constructor locally you'll get an error trying to download the word database. You can follow the [instructions in the deployment guide](/DEPLOY.md#updating-wordlist--clue-database) to build and upload a version to your firebase app, or you can download a pregenerated [`worddb.json`](https://drive.google.com/file/d/1bIjSwDDmMhX8u_xoyfs5PVxKuBD0ChhQ/view?usp=share_link) (generated March 16, 2023) and upload it using the final command in [the deployment guide](/DEPLOY.md#updating-wordlist--clue-database).

Once the wordlist has been updated you need to update your cloud storage CORS settings so it can be downloaded in the browser. This [stackoverflow post](https://stackoverflow.com/a/58613527) gives a step-by-step run down.