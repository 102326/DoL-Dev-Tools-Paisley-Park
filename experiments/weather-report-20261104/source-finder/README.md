# Typed source finder: implementation and comparison tools

The authoritative implementation is now [scripts/lib/source-find.cts](../../../scripts/lib/source-find.cts), called by the existing `source-find` CLI. The formal CLI runs its pre-generated CommonJS module with Node >=26 and standard libraries; it does not load the TS parser. Git is required for fixed revisions and commit metadata; plain directory search can retain unknown Git identity when Git is unavailable. Ordinary use needs no TypeScript compiler, build step, experimental package, device or Goal. See [GAME_SOURCE](../../../docs/GAME_SOURCE.md#有界候选工具与接续) for CLI queries, local output, partial results, budgets and privacy.

The experiment's original implementation has moved. Its generated source-find.cjs is committed with the TS source hash, not maintained as another implementation. Precise shop Source Link remains separate. No game source is included or downloaded. First-batch evidence is frozen in `REPORT.md`/`results.json` at commit `e2e6623`; current files implement the follow-up integration.

## Development and reproducible checks

The authoritative multi-file build is now [tools/typescript](../../../tools/typescript/README.md). Install its isolated locked developer dependencies with `npm ci --prefix tools/typescript --ignore-scripts --no-audit --no-fund`. The old `build.cjs`, `build-resolver.cjs`, checker and test commands remain compatibility entries; they no longer recursively clean or generate an experiment `dist/` directory. An existing compiler installed here is accepted by those entries, but the formal path uses the single current build configuration.

`source-find.cts` is authoritative; `source-find.cjs` is the production output and `source-find.mts` is a generated native-comparison view of the same source. The formal build checks the complete Program output and comparison view, not merely a hash. Explicit generation stages every changed artifact, preserves prior file modes, publishes only under a cooperating-builder lock and rolls back earlier publications on ordinary later failures. External editors are not covered by an atomic filesystem CAS; preserve unknown files/backups and rerun the check after interruption. Runtime users need neither this experiment nor its compiler.

From repository root:

```sh
node --test tests/source-find.test.cjs tests/source-find-cli.test.cjs
npm --prefix experiments/weather-report-20261104/source-finder run build
node experiments/weather-report-20261104/source-finder/check-types.cjs
node experiments/weather-report-20261104/source-finder/native-probe.cjs
node experiments/weather-report-20261104/source-finder/replay-maintenance.cjs
node experiments/weather-report-20261104/entry/benchmark.cjs
```

The compatibility checker covers the current finite contracts and unknown-data boundaries across Source Find, resolver, diagnostics, targets, CDP and Integration. The native probe compares native execution of the generated native `.mts` view of the authoritative `.cts` with the prebuilt CommonJS output for five queries and invalid/cancelled requests. Running TS is not type checking; the [Node26 official contract](https://github.com/nodejs/node/blob/v26.0.0/doc/api/typescript.md) documents the distinction. CI performs the isolated checker steps; installed users do not receive checker dependencies.

The entry experiment defaults to the same prebuilt CommonJS runtime. To compare native startup, set `PAISLEY_SOURCE_ENGINE=native` for `benchmark.cjs` (PowerShell uses `$env:PAISLEY_SOURCE_ENGINE='native'`). This is an experiment enum, never an arbitrary module path. Do not rebuild during a compiled-engine comparison. Each benchmark records the actual loaded file, entry/fixture hashes and mode; child compile caching is disabled for this comparison.

`entry/once.cjs` and `stdio.cjs` accept a raw engine request containing `schemaVersion`, absolute `root`, optional `revision`, `clues`, and optional `limits`. The formal CLI instead supplies root/revision as flags and uses a query JSON without these keys. Do not interchange these two formats. For normal work use the formal CLI, which publishes complete local output without replacing files; the engine/experimental entries do not persist output themselves.

## Interpretation

Search is literal and definitions are syntax heuristics. Candidate rank is not a probability, exact runtime mapping or proof of loaded code. Supported source extensions include Twee, JS/TS variants, CSS/SCSS/Sass/Less, HTML, JSON and Markdown. Hidden/ignored-for-search private/generated paths and symlinks remain excluded. Worktree reads have per-file SHA-256, not atomic whole-tree consistency; fixed revision reads use Git objects and disable replace refs. Time limits are cooperative, not OS preemption. Context is bounded and visibly truncated.

The existing real maintenance replays locate public tool modules; they are known investigations, not blind new bug discoveries or an Agent-efficiency trial. Full real-game/non-shop source acceptance, Windows, Android/WebView and Codex tool registration remain separate unvalidated scopes. This directory is not included in product archives; production code, root regression tests, query schema and usage Reference are.
