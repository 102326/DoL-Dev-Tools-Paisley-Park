# TUSK ACT4 7.0 — Mac implementation progress

2026-11-04. Development branch: `experiment/tusk-act4-7`. This is an implementation checkpoint, not 7.0 release acceptance. The npm package version remains 6.1.0 until version/package closeout. The approved [implementation plan](../../docs/superpowers/plans/2026-11-04-tusk-act4-7.md) records the baseline and Windows division.

## Delivered

- New production PC Debug CLI: `pc-start`, `pc-pages`, `pc-bind`, `pc-observe`, `pc-action`. Explicit HTML/resource snapshots, loopback authority, owned visible/headless Chrome, exact target/document identity, explicit rebind, state probes and local evidence. Retained-profile resume requires the original origin and resource digest.
- Reused current Web Action implementation and current full-document-URL primitive. Android foreground checks and guarded operation/receipt behavior remain on their original path. Historical MIT Chrome code is selectively adapted; no old tree overlay or Store migration.
- Runtime expression checks URL again in the same JS turn; unique context alone cannot detect same-document navigation. Bound arbitrary-object callFunctionOn is deliberately not exposed before shared semantic-operation binding is integrated.
- Long-line source lookup now returns an excerpt near the match and explicit Unicode starting column. 512-codepoint clues may only partially fit a 240-codepoint window; truncation remains explicit.
- Android Activity lifecycle probe source and Gradle project prepared, with Windows build/deploy/comparison steps. No SDK downloaded, no APK compiled, no device attached. It is not yet a device agent or adoption decision.

## Validated

Mac: macOS 27.0.1 ARM64, Node 26.13.0, Chrome 156.0.8078.73. All PC inputs are synthetic neutral HTML/JS/CSS; no game material.

- `node experiments/tusk-act4-7/pc/verify.cjs ABS_CHROME NEW_OUTPUT headless`: 9/9 actual CLI/Chrome scenarios passed (`artifacts/tusk7-pc-headless-03/results.json`).
- Same command with `visible`: 9/9 passed (`artifacts/tusk7-pc-visible-01/results.json`). Proves actual Chrome invocation/rendering, not a user visual approval.
- Both runs: external resources, observation, one action independently checked against DOM and fixture state, explicit reconnect, same-URL reload refusal, duplicate URL selection/decoy isolation, hash rebind, deterministic URL-change interleaving before expression, closed target rejection, retained Profile/origin and fixture localStorage after browser restart.
- Shared Action/execution/Journey/semantic-binding/source tests: 70/70 passed before later PC-only edits. Root quick suite at that checkpoint: 496 total, 495 passed, one Windows-only skip. New focused identity/launch checks are recorded in the next checkpoint after execution, not counted prematurely.
- Source checker/generated CJS match and four negative type-contract cases passed. Android Manifest XML parsed; Android compilation remains unvalidated.

Failures preserved: first Chrome run failed before observation because the target list advertised the requested URL while initial document/history was not ready. A diagnostic isolated the URL-proof failure; initial binding now waits for a provable exact document. No dispatched action was retried. Raw failure/log/Profile evidence stays ignored locally. Review also identified the same-context navigation race and unconfirmed startup cleanup; URL checks and bounded owned-child termination were added rather than relying on post-action checks alone.

## Not validated / remaining implementation

- Windows Chrome, real DoL/Mods/state/save handling, Android build/install/device comparison and real multi-region game source quality remain for Windows.
- Chrome production Journey/GER and semantic object/receipt binding are not yet integrated. Existing Android GER remains available; PC Debug ACK is not a business Outcome or exactly-once guarantee. No cross-process lock is implied; ordinary Debug actions must be serialized by the caller.
- Company Mac restriction on adult game resources and the owner's SDK/APK deferral remain effective. The first Android source probe establishes no performance benefit.
- Independent archive/Skill-entry verification for the new PC payload is still a required next check. Existing Weather Report package/host-discovery evidence does not automatically validate these new files.

No main merge, PR, tag, release or private evidence upload. The private maintenance report remains untracked. The SDK/APK choice is an explicit Windows handoff, not an open permission question.
