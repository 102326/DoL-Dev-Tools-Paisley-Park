---
name: dol-dev-tools
description: Diagnose DoL Android, WebView, UI and Mod compatibility issues using the local DoL Dev Tools CLI and evidence bundles. Use for live-site diagnosis and evidence interpretation; not for ordinary source edits without a reported runtime issue.
---

# DoL development diagnostics

Tools obtain observations; optional integrations expose a project's interpretation; this skill chooses the cheapest sufficient diagnostic path. Do not implement collectors inside the skill or copy another project's Runtime into Tools.

Find this repository from the skill location: three parents above the skill directory. Run `node scripts/dol-dev.cjs --help` from that repository before using a command whose availability is unclear. See [current commands and limitations](../../../docs/DIAGNOSTICS.md) only for the relevant mode.

Use the user's selected device and package. Verify current state before reusing a port, PID, path, screenshot or historical evidence. Never select a different device to make a failed command pass. If a live capture has no explicit target, inspect available environment information without selecting a target, then obtain the missing target before capture.

## Modes

| Mode | Cheapest useful path | Escalation |
| --- | --- | --- |
| quick-inspect | Existing evidence or `doctor`; `capture` and manually inspect its current screen; scoped `dom-snapshot` / CDP if needed | `evidence` when independent sources are necessary |
| compatibility-diagnose | Scoped DOM contracts of affected versions → `dom-diff` → optional integration in `evidence` | Compare structure with Runtime/Adapter interpretation; missing integration does not prevent generic diagnosis |
| visual-diagnose | Capture affected screen → `visual-diff` with a comparable Golden → DOM/CSS investigation | Check viewport, fonts, platform, game state and optional visual tier before attributing differences to a regression |
| performance-diagnose | `perf` for gfxinfo/meminfo → Chrome Performance if needed | A concrete unresolved scheduling/rendering question can justify Perfetto, separately scoped |
| full-evidence | `evidence` with an explicit DOM scope, short `--logcat-seconds`, optional integration and user reproduction note | Add short `--record-seconds` if motion matters; `--full --sensitive yes` requests system trace and bugreport only for a concrete unresolved problem |

For an ordinary user's issue, project a local Evidence Bundle using `support`; screenshot is excluded unless explicitly selected. Check the resulting files before sharing. Do not upload them or create an Issue without authorization.

## Decision rules

- Default to observation: no business clicks, purchases, wardrobe changes, story progression, game-variable writes, save access, APK deployment, app restart or lifecycle ownership. Existing general evaluator executes supplied JavaScript; only use reviewed read-only probes for diagnosis.
- Evidence/record create temporary transport or capture resources; acknowledge their scope. `doctor` checks environment and must not repair it. Original Android CLI layout may install a helper APK; do not silently substitute it for a failed read-only collector.
- Read manifest first: incident ID, requested profile, capture times, completion status, source, failed/skipped/unsupported steps and privacy limits. A `complete` package is collection completeness, not a test verdict.
- Android/CDP/DOM are observations from those sources; Runtime/Adapter are interpretations; repro notes are user context. Different sample times or truncated data can explain disagreement. Do not invent past events or infer hidden state from a screenshot.
- A scoped DOM Diff uses structural addresses, not proven node identity. Insertions can shift addresses. It does not freeze third-party DOM or decide compatibility by itself.
- Console/Logcat omit message content by default; Network omits private bodies/paths. Say when these summaries cannot establish a root cause. Screenshots, recordings and reproduction notes need manual privacy review.
- gfxinfo is an Android statistic, not whole-game speed; meminfo growth does not prove a leak. Golden Diff reports pixels, not quality or release acceptance.
- Keep successful evidence when another collector fails. No infinite retries, replacing baselines automatically, or upgrading to full/heavy capture without a concrete unresolved question.
- Change only the implicated source or adapter after enough evidence exists. Verify the affected behavior with the smallest relevant check; do not trigger whole-project or device tests merely because a diagnostic command ran.

Perfetto (`perf --deep`) needs a reviewed official recorder selected through DOL_PERFETTO_RECORDER, supported Android, and explicit sensitive capture selection; do not download it automatically. `bugreport` also requires explicit sensitive selection and may leave an Android system copy. Native action/journey commands are not provided. Never treat this skill as permission to install tools or touch private app data. The private Backup command is separate from Evidence/Support and requires the user's corresponding task scope.
