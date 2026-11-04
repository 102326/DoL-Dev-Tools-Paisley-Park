# TypeScript source-finder experiment

This is a runnable read-only candidate finder, separate from the shipped CLI and precise shop Source Link. It searches an explicitly selected local directory, or fixed Git commit, with literal Passage, widget/macro, text, selector, event, symbol and path clues. It does not execute source code or queries. No game source is included or downloaded.

## Run

Node >=26 and Git are required. In this isolated directory, run `npm ci --ignore-scripts` in your approved npm environment, then `npm run build` (the lock pins TypeScript 6.0.2, Node types 25.9.5 and undici-types 7.24.6). TypeScript is a build/check dependency only; the resulting CommonJS engine uses Node standard libraries. An existing reviewed TypeScript 6.0.2 installation can instead be reused by setting `PAISLEY_TSC` to its `bin/tsc` and `PAISLEY_TYPE_ROOTS` to the parent containing `node/` types. No private local path is embedded in these scripts. Do not run concurrent builds against an active experiment host.

From the repository root:

```sh
node --test experiments/weather-report-20261104/source-finder/test/*.test.cjs
node experiments/weather-report-20261104/source-finder/check-types.cjs
node experiments/weather-report-20261104/source-finder/replay-maintenance.cjs
node experiments/weather-report-20261104/entry/once.cjs < REVIEWED_REQUEST.json
```

`check-types.cjs` needs the same compiler/type-root selection as the build. `entry/stdio.cjs` provides the alternative reusable process; see its README for request IDs, queueing, cancellation and shutdown. These entry points run the same compiled engine.

A request JSON (replace the root with the actual reviewed absolute source directory):

```json
{
  "schemaVersion": 1,
  "root": "/REVIEWED_SOURCE",
  "clues": [{"kind":"passage","value":"TrainingRoom"}],
  "limits": {"maxResults":50,"maxFiles":2000,"maxBytes":8388608,"contextLines":1,"timeoutMs":10000}
}
```

`revision` optionally selects a reviewed Git ref, resolved to a full commit. Revision mode requires the repository root, reads Git objects, disables replace refs and inherited Git location overrides, and never checks out or resets. Worktree/directory mode reads files individually and reports their actual SHA-256; it is not an atomic whole-tree snapshot. Worktree `commit` is a base, not a claim that each byte is committed. `dirty` conservatively includes ignored files under the selected root, including excluded generated files; concurrent edits remain possible. A missing Git identity is null, not an invented revision.

## Contract and limits

- Unknown request fields/types and invalid bounds fail before source reads. Limits cap results, attempted files, accepted bytes, context and elapsed time. Failed/oversized reads consume file attempts. Cancellation and elapsed timeout have distinct finite errors; no raw exception/root/query is echoed in errors.
- Timeout is cooperative Node cancellation with monotonic checks; synchronous OS/native operations cannot be forcibly preempted at exactly the deadline. Over-budget work is rejected before success; this is not a hard real-time engine. No retries, side effects, GER Store or effect settlement are involved.
- Candidates include relative file, one-based Unicode codepoint column, line, digest, bounded context, heuristic score and definition/reference/path basis. Context lines longer than 240 codepoints are visibly truncated; the excerpt begins at the line start. Definitions are syntax heuristics, not a full parser or proof of actual loaded code.
- `complete` refers to the eligible selected search, not all repository content. Hidden paths, dependencies, generated directories, Profiles, saves/logs/credentials and symlinks are excluded; only the code/document extension allowlist is searched. Exclusion counts and attempted/read counts are reported. Enumeration stops at 50,000 filesystem entries or 20,001 eligible Git entries; result/byte/file/encoding/read limits produce partial reasons. Partial cannot certify no match.
- Directory symlinks are not traversed. Files are rechecked and opened with NOFOLLOW; parent rename races are still possible. This is best-effort source selection, not an OS security sandbox. Windows filesystem/NOFOLLOW behavior is not validated.
- Source content and clues in successful output can be private. Results stay local; there is no automatic upload or output file overwrite. Redirect only to a new reviewed local result path. The engine itself does not persist output.

## Validation scope

Owned multi-area fixtures exercise all seven clue types, ambiguity, no match, encoding and truncation; real Git repositories exercise dirty worktrees, fixed refs, replace refs and ignored source. Type negatives detect four finite contract drifts, while runtime tests cover failures that types do not detect. `replay-maintenance.cjs` locates actual public Paisley maintenance modules for version querying and hash invalidation, followed by existing project tests. These are already known investigations replayed as integration checks, not new discoveries or measured Agent efficiency.

Real game source, non-shop real-game scenes, actual Android, Windows and Codex tool registration are not validated. Full game coverage cannot be inferred from synthetic fixtures or Paisley's own source. This first experiment is a basis for deciding integration; it does not change the stable product command/Store/Skill execution contracts.

## Native TypeScript feasibility

`node experiments/weather-report-20261104/source-finder/native-probe.cjs` copies the exact engine source bytes to a temporary `.mts`, runs Node 26 built-in stripping, and compares five query results plus invalid/cancelled requests against compiled CommonJS. An initial parameter-property constructor failed with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`; explicit class fields fixed this without a runtime loader. The build now enforces `erasableSyntaxOnly`. The authoritative source remains `.ts` under a CommonJS package: direct import is **not** the operational entry yet; the probe does not change release module layout or replace `tsc` checking. See the [Node 26 official contract](https://github.com/nodejs/node/blob/v26.0.0/doc/api/typescript.md).
