## [crosshare.org](https://crosshare.org)

Crosshare is a free community for crossword constructors and solvers. Crosshare is written in TypeScript using Next.js, React, and firebase.

Use [GitHub issues](https://github.com/crosshare-org/crosshare/issues) for bug reports and feature requests.

## Contributing

Contributions are very much encouraged! It's recommended that you comment on (or create) the relevant issue before starting work so that we don't have multiple folks duplicating efforts simultaneously. Once you're happy with your changes please submit a pull request describing the change, any concerns, etc. PRs that include tests for the changed behavior are much more likely to be swiftly merged.

If you're looking for good issues to start out on check the [good first issue](https://github.com/crosshare-org/crosshare/issues?q=is%3Aissue+is%3Aopen+label%3A"good+first+issue") tag.

### Linting / Formatting

In addition to the test suites, all PRs are checked to match our [eslint](https://eslint.org/) and [prettier](https://prettier.io/) rules. You can run `$ yarn lint` and `$ yarn format` before committing to make sure your PR will pass. 

## Running the site locally

We are in the process of moving to a container based dev workflow. These instructions are written for [podman](https://podman.io/) and [docker-compose](https://brandonrozek.com/blog/rootless-docker-compose-podman/) but will hopefully work with `docker` as well - if you try it please let us know to confirm it works or report any issues. If you'd rather not use containers there are old instructions for running on your machine directly [here](/RUNNING_CONTAINERLESS.md).

### Developing against the firebase emulators (recommended)

After checking out the codebase run the following in the root of the repository:

> $ docker-compose up dev

The first run will take a while as it will build the development container - future runs will be quicker. Once everything is up and running the site should be visible at http://localhost:3000 and the emulator admin at http://localhost:4000

### Demo data

The emulators will start with some demo data. We try to keep the demo dataset small but would like for it to cover basic use/test cases. Note that the word database (used for autofill) included in the demo dataset only includes words w/ <= 5 characters, to keep the filesize down. Each time you start the dev server any auth/database changes are reset to match the demo dataset.

If you need to alter the demo data to expand what's available please do so. While the dev server is running make any changes you need, either through the user interface itself or through the emulator admin. Then run:

> $ podman exec crosshare-dev firebase emulators:export --force --project demo-crosshare emulator-data

If you feel your change to the demo data will be generally useful please feel free to include it in your PR with a description of what has been added.

### Stopping the dev containers

> $ docker-compose down

### Developing against your own firebase project

If you'd rather not use the firebase emulators you can use the same container but connect to a live firebase project instead.

You'll need to have a firebase project set up and `firebaseConfig.ts` and `serviceAccountKey.json` created in the correct locations - see [Running Containerless](/RUNNING_CONTAINERLESS.md) for details on setting up firebase and creating those files. Then in the root of the repo run:

> $ docker-compose up devLive

## Running Tests

While the dev container is running use the following command to run the suite of jest unit tests:

> $ podman exec -e NODE_OPTIONS='--experimental-vm-modules' crosshare-dev npx jest --ci

And to run playwright tests:

> $ podman exec crosshare-dev npx playwright test

## Credits

See the [contributors](https://github.com/crosshare-org/crosshare/graphs/contributors) on this repository and [crosshare.org/donate](https://crosshare.org/donate).

## License

Crosshare is licensed under the GNU Affero General Public License 3.
