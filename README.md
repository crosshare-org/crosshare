## Deploy steps

### Test locally
$ docker build . --target prod -t gcr.io/mdcrosshare/prod:latest
$ docker-compose up testBuild
$ podman run -v ./serviceAccountKey.json:/app/serviceAccountKey.json --env GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json --env PORT=5000 -p 3000:5000 -it --security-opt label=disable gcr.io/mdcrosshare/prod

### Deploy staging
$ docker push gcr.io/mdcrosshare/prod:latest
$ gcloud beta run deploy staging --image gcr.io/mdcrosshare/prod
$ cd app
$ npx firebase deploy --only hosting:staging

### Deploy prod
$ gcloud beta run deploy prod --image gcr.io/mdcrosshare/prod
$ cd app
$ npx firebase deploy --only hosting:prod

## Old commands for running test env locally, needs updates:

Build:
$ docker build . --target jest -t jest
$ docker build . --target emulators -t emulators
$ docker build . --target base -t dev

Run emulators:
$ docker run -p 8080:8080 -ti --rm --name=emulators --network=crosshare_default emulators
Run jest:
$ docker run -ti -v $(pwd)/app:/src/app --rm --network=crosshare_default jest jest --maxWorkers=2
Run dev site:
$ docker run -ti -p 3000:3000 -v $(pwd)/app:/src/app -v $(pwd)/serviceAccountKey.json:/src/serviceAccountKey.json --rm dev yarn dev

## Podman directions
$ podman build . --format docker --target prod -t gcr.io/mdcrosshare/prod:latest --isolation=rootless
$ toolbox run gcloud auth print-access-token | podman login -u oauth2accesstoken --password-stdin gcr.io
$ podman push gcr.io/mdcrosshare/prod:latest --remove-signatures
$ toolbox run gcloud run deploy staging --image gcr.io/mdcrosshare/prod