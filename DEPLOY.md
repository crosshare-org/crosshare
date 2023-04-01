This document is only useful for site admins to keep track of deploy steps. Contributors should see `README.md` for instructions on setting up a development environment

## Deploying a new version of the site (to staging)
```shell
$ podman build . --format docker --target prod -t gcr.io/mdcrosshare/prod:latest --isolation=rootless
$ toolbox run gcloud auth print-access-token | podman login -u oauth2accesstoken --password-stdin gcr.io
$ podman push gcr.io/mdcrosshare/prod:latest --remove-signatures
$ toolbox run gcloud run deploy staging --image gcr.io/mdcrosshare/prod
```

## Deploying to prod
```shell
$ toolbox run gcloud run deploy prod --image gcr.io/mdcrosshare/prod
```

## Updating datastore rules
```shell
$ cd app
$ toolbox enter crosshare
$ npx firebase deploy --only firestore
```

## Deploying functions
```shell
$ cd functions
# Deploy all functions:
$ npx firebase deploy --only functions

# Or, e.g. deploy import/export:
$ npx firebase deploy --only functions:scheduledFirestoreExport
# Deploy analytics:
$ npx firebase deploy --only functions:analytics
# Deploy puzzle update trigger:
$ npx firebase deploy --only functions:puzzleUpdate
```

## Updating wordlist + clue database
```shell
# First download cluer.zip from http://tiwwdty.com/clue/
# Unzip and extract the `cluedata` file to the root of this repo
# Now build cluedata.txt:
$ python generate_db.py

# Can build clue database now:
$ cd app
$ ./scripts/buildGinsberg.ts ../cluedata

# Build wordlist:
# Download expanded names: https://sites.google.com/view/expandedcrosswordnamedatabase/home
# Download peter's wordlist: https://peterbroda.me/crosswords/wordlist/
# Download spread the wordlist: https://www.spreadthewordlist.com/wordlist
$ ./scripts/buildWordlist.ts ../peter-broda-wordlist__scored.txt ../cluedata.txt ../ExpandedNames_unscored.txt ../spreadthewordlist.txt worddb.json

# Upload wordlist:
$ GOOGLE_APPLICATION_CREDENTIALS=../serviceAccountKey.json ./scripts/uploadWordlist.ts

# If deploying for prod, now increment version constant in WordDB.ts to force rebuild
```

_n.b._ if you're developing on your own Firebase project, you'll need to create Storage before you upload the wordlist: Build > Storage > Get Started > Start in production mode > Save. You don't need to create anything in there, it just needs to be set up before you can upload the wordlist otherwise you'll get a "bucket does not exist" error.

Then you'll need to set read permission on your storage by going to Rules > Edit rules and changing `allow read, write: if false;` to `allow read: if true;`.
