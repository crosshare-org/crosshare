## [crosshare.org](https://crosshare.org)

Crosshare is a free community for crossword constructors and solvers. Crosshare is written in TypeScript using Next.js, React, and firebase.

Use [GitHub issues](https://github.com/crosshare-org/crosshare/issues) for bug reports and feature requests. There is an active community on [Discord](https://discord.gg/8Tu67jB4F3) which is great place to ask questions or discuss ideas.

## Contributing

Contributions are very much encouraged! It's recommended that you comment on (or create) the relevant issue before starting work so that we don't have multiple folks duplicating efforts simultaneously (or mention it on [Discord](https://discord.gg/8Tu67jB4F3)!). Once you're happy with your changes please submit a pull request describing the change, any concerns, etc. PRs that include tests for the changed behavior are much more likely to be swiftly merged.

If you're looking for good issues to start out on check the [good first issue](https://github.com/crosshare-org/crosshare/issues?q=is%3Aissue+is%3Aopen+label%3A"good+first+issue") tag.

### Linting / Formatting

In addition to the test suites, all PRs are checked to match our [eslint](https://eslint.org/)/[stylelint](https://stylelint.io/) and [prettier](https://prettier.io/) rules. You can run `$ pnpm lint` and `$ pnpm format` before committing to make sure your PR will pass.

## Running the site locally

We use a [devcontainer](https://containers.dev/) based workflow. These instructions assume you're using VS Code but should still work if you start the container some other way.

### Getting started

After checking out the codebase open the directory in VS Code. You should see a message giving you the option to "Reopen in Container" - go ahead and do that. It might take a little while to build the container if it's your first time using it. Open a terminal in VS Code with ctrl-` and run the following commands:

> $ cd app
> $ pnpm install

Since it's your first time using pnpm you should get prompted that corepack will install it. Hit 'Y' and wait for all of the dependencies to install. Now run the following three commands:

> $ cp firebaseConfig.emulators.ts firebaseConfig.ts
> $ pnpm compileI18n
> $ pnpm emulate

The last command will bring up the firebase emulators and then start Crosshare. When everything is running you should see:
>  ✓ Ready
at the bottom of your terminal. Now the site should be visible at http://localhost:3000 and the emulator admin at http://localhost:4000

### Demo data

The emulators will start with some demo data. We try to keep the demo dataset small but would like for it to cover basic use/test cases. Note that the word database (used for autofill) included in the demo dataset only includes words w/ <= 5 characters, to keep the filesize down. Each time you start the dev server any auth/database changes are reset to match the demo dataset.

If you need to alter the demo data to expand what's available please do so. While the dev server is running make any changes you need, either through the user interface itself or through the emulator admin. Then in a new terminal run:

> $ firebase emulators:export --force --project demo-crosshare emulator-data

If you feel your change to the demo data will be generally useful please feel free to include it in your PR with a description of what has been changed.

### Running Tests

While the emulators are running use the following command (in a second terminal) to start the test runner:

> $ pnpm test

Once it's started you can hit `a` to run all of the tests. Alternatively, if the emulators aren't already running you can use:

> $ pnpm emulatorAndTest

That'll start just the firestore emulator (the only one needed for tests) and then launch the test runner.

There are also playwright tests that can be run (while the app is running), but YMMV with these:

> $ pnpm playwright test

## Credits

See the [contributors](https://github.com/crosshare-org/crosshare/graphs/contributors) on this repository and [crosshare.org/donate](https://crosshare.org/donate).

## License

Crosshare is licensed under the GNU Affero General Public License 3.
