# Independent package Runtime smoke

Run `node experiments/weather-report-20261104/package-check/runtime-smoke.cjs REVIEWED_LOCAL_PACKAGE.zip` from the repository root. It extracts a previously reviewed package into a fresh temporary directory outside the source tree, confirms XState cannot be imported before installation, installs the original locked dependency from the already populated local npm cache using `--offline --ignore-scripts`, and verifies resolution points inside that package.

It then creates its own synthetic Session in a new absolute SQLite path, checks schema2/integrity, closes and reopens it, and checks persisted identity/deadline and zero effects. Its provider is an explicit synthetic, side-effect-free fixture. No device, observation, dispatch, player Store, save, original Unknown or migration is used. The SQLite handle is closed before the owned fixture directory is removed.

`PAISLEY_NPM_CLI` can select a reviewed installed `npm-cli.js` when testing a standalone Node binary. A Node runtime does not necessarily include npm: the initial minimum-version attempt exposed this assumption, so dependency-tool selection now completes before creating the fixture. Missing cache/tools are setup failures, not gameplay or device diagnoses. This helper is excluded from release archives and is not a new product runner.
