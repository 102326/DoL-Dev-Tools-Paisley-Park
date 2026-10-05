---
name: dol-dev-tools
description: Investigate and reproduce live DoL Mod issues using Android, WebView/CDP and local evidence, then guide scoped fixes and verification. Applies across vanilla, UI, content, framework and manager Mods; optional integrations enhance diagnosis.
---

# DoL ecosystem development and diagnostics

Tools provide live-site access and evidence; optional integrations expose a project's interpretation; this skill chooses the cheapest sufficient development path. Soft & Wet, MapleBirch, ModHub and other integrations are peers. Do not implement collectors inside the skill or copy another project's Runtime into Tools.

Find this repository from the skill location: three parents above the skill directory. Run `node scripts/dol-dev.cjs --help` from that repository before using a command whose availability is unclear. See [current commands and limitations](../../../docs/DIAGNOSTICS.md) only for the relevant mode.
The [capability blueprint](../../../docs/BLUEPRINT.md) is a roadmap, not an executable command list: The packaged 1.1 baseline predates the new development primitives. Verify --help and current docs before use. Recorder candidates, selected matrix, animation frames, network scenarios, viewport and process probes are development commands. The controlled Workshop fixture has build/deploy/verify proof; real project/device deployments require their own proof. Use verified available tools and the target project's own commands; never invent a planned CLI command.

Use the user's selected device and package. Verify current state before reusing a port, PID, path, screenshot or historical evidence. Never select a different device to make a failed command pass. If a live capture has no explicit target, inspect available environment information without selecting a target, then obtain the missing target before capture.

## Modes

| Mode | Cheapest useful path | Escalation |
| --- | --- | --- |
| quick-inspect | Existing evidence or `doctor`; `capture` and manually inspect its current screen; scoped `dom-snapshot` / CDP if needed | `evidence` when independent sources are necessary |
| compatibility-diagnose | Scoped DOM contracts of affected versions → `dom-diff` → optional integration in `evidence` | Compare structure with Runtime/Adapter interpretation; missing integration does not prevent generic diagnosis |
| visual-diagnose | Capture affected screen → `visual-diff` with a comparable Golden → DOM/CSS investigation | Check viewport, fonts, platform, game state and optional visual tier before attributing differences to a regression |
| performance-diagnose | `perf` for gfxinfo/meminfo → Chrome Performance if needed | A concrete unresolved scheduling/rendering question can justify Perfetto, separately scoped |
| full-evidence | `evidence` with an explicit DOM scope, short `--logcat-seconds`, optional integration and user reproduction note | Add short `--record-seconds` if motion matters; `--full --sensitive yes` requests system trace and bugreport only for a concrete unresolved problem |
| reproduce | Reviewed JSON `action` / `journey`, static `--plan`, then execution on the identified test environment | Stop after uncertain actions; keep checkpoints and cleanup evidence; see [ACTIONS](../../../docs/ACTIONS.md) |
| structure-and-events | CSS snapshot/diff, `dom-inspect`, short `timeline` or storage metadata only as needed | See [INSPECTORS](../../../docs/INSPECTORS.md); incomplete data cannot prove deletion, pixel occlusion or ownership; Observer instrumentation is explicitly opt-in |
| evidence-review | Offline `evidence-compare` / `issue-report`, caller-selected `known-good` snapshots | See [EVIDENCE_TOOLS](../../../docs/EVIDENCE_TOOLS.md); report generation does not authorize an upload, and reference selection does not prove business correctness |
| controlled-experiment | Reviewed `matrix` or `network-scenario --plan`, scoped `journey-record` candidates | See [NETWORK](../../../docs/NETWORK.md) and [ACTIONS](../../../docs/ACTIONS.md); network requires an explicitly neutral baseline and no competing settings owner; candidate input stays unresolved |
| viewport-and-native | Reviewed `viewport-matrix --plan` or explicitly selected `native-layout` | See [VIEWPORT](../../../docs/VIEWPORT.md) and [NATIVE_LAYOUT](../../../docs/NATIVE_LAYOUT.md); metrics require no original override and exclusive ownership; native layout may run/install the existing CLI helper |
| development-loop | Observe implicated source → scoped fix → target-owned build/deploy → same-scene verification | See [WORKSHOP](../../../docs/WORKSHOP.md); retain source/artifact hashes, actual loading proof and before/after evidence; browser fixture proof is not Android deployment |

For motion evidence, use a short existing recording and optional offline `animation-frames`; see [ANIMATION](../../../docs/ANIMATION.md). Do not call sampled frame indices exact source timestamps or treat synthetic/browser proof as Android animation acceptance.

For optional diagnostics, use the builtin `--integration soft-and-wet` or explicit `--integration-file REVIEWED_LOCAL.cjs`; review the local module before executing it. Modules run with Node permissions in a bounded worker, not a security sandbox. Missing/unsupported/failed integrations do not invalidate Generic completeness. See [Contract 1](../../../docs/INTEGRATIONS.md) and [public evidence formats](../../../docs/FORMATS.md). Do not guess another Mod's private API or copy custom diagnostic payloads into Support.

For an ordinary user's issue, project a local Evidence Bundle using `support`; screenshot is excluded unless explicitly selected. Check the resulting files before sharing. Do not upload them or create an Issue without authorization.

## Decision rules

- Live Site First: for a runtime issue, inspect the current device screen, actual WebView via CDP and Android/App via ADB as needed before guessing from source. The standalone Android CLI supplies annotated screen/layout when useful; Chrome Inspect is the manual investigation path. Choose the smallest necessary sources.
- Inspect/Doctor/Evidence are observational. In an identified test save/account, isolated App or temporary data environment, perform task-relevant clicks, input, navigation, setting changes, restarts, rotation and ordinary game reproduction without asking again for each routine step. Keep actions distinct from capture and report their scope. A connected or running App alone is not proof of a test environment.
- Deleting/overwriting real saves or cloud data, clearing production user data, deleting real Mods or changing real credentials requires corresponding explicit authorization. Establish the target/environment before dependent actions when unclear; meanwhile continue useful observation. Existing general evaluator executes supplied JavaScript: review it and use read-only probes for inspection, separately scoped operations for reproduction.
- Evidence/record create temporary transport or capture resources; acknowledge their scope. `doctor` checks environment and must not repair it. Original Android CLI layout may install a helper APK; do not silently substitute it for a failed read-only collector.
- Read manifest first: incident ID, requested profile, capture times, completion status, source, failed/skipped/unsupported steps and privacy limits. A `complete` package is collection completeness, not a test verdict.
- Android/CDP/DOM are observations from those sources; Runtime/Adapter are interpretations; repro notes are user context. Different sample times or truncated data can explain disagreement. Do not invent past events or infer hidden state from a screenshot.
- A scoped DOM Diff uses structural addresses, not proven node identity. Insertions can shift addresses. It does not freeze third-party DOM or decide compatibility by itself.
- Console/Logcat omit message content by default; Network omits private bodies/paths. Say when these summaries cannot establish a root cause. Screenshots, recordings and reproduction notes need manual privacy review.
- gfxinfo is an Android statistic, not whole-game speed; meminfo growth does not prove a leak. Golden Diff reports pixels, not quality or release acceptance.
- Use bounded `perf-series` when repeated native/heap/DOM/listener measurements resolve the question; see [PERFORMANCE](../../../docs/PERFORMANCE.md). Check power state before treating a paused CDP connection or black screenshot as an App failure. Use explicit wake only on the identified test target.
- Use `leak-probe --detached yes` only when detached counts help the investigation; unsupported is not zero. Observer wrappers may retain instrumented objects. `evidence-timeline` preserves missing anchors, source omissions and unknown envelopes; its ordering does not prove causation or reconstruct native frame intervals.
- Use `process-memory` only when per-process Android memory matters; exact ActivityManager packageList association does not establish CDP renderer ownership. See [PROCESS_MEMORY](../../../docs/PROCESS_MEMORY.md). For touch-size/overlap questions, `hitbox-overlay` shows measured rectangles and center samples, not complete event dispatch behavior.
- Keep successful evidence when another collector fails. No infinite retries, replacing baselines automatically, or upgrading to full/heavy capture without a concrete unresolved question.
- Change only the implicated source or adapter after enough evidence exists. Verify the affected behavior with the smallest relevant check; do not trigger whole-project or device tests merely because a diagnostic command ran.

## Fix and verify loop

After evidence establishes an actionable issue, locate the implicated source in the user-selected project. Make the scoped change, use that project's existing build/deploy workflow when authorized by the task, verify the same affected page/action on the identified test target, and retain before/after evidence. Source tests, build success, deployment version and actual device behavior are separate proof levels. Do not edit unknown third-party code or assume every Mod has Soft & Wet's Adapter model.

For an explicit reproduction workflow, inspect any available plan first, verify the current selector/target and bound waits. Keep successful checkpoints on failure; clean up temporary resources and restore experiment settings such as network conditions/orientation when the task requires it. Do not silently retry a Journey until it passes or introduce a new automation framework to compensate for a missing command.

Perfetto (`perf --deep`) needs a reviewed official recorder selected through DOL_PERFETTO_RECORDER, supported Android, and explicit sensitive capture selection; do not download it automatically. `bugreport` also requires explicit sensitive selection and may leave an Android system copy. Development action/journey commands use reviewed local JSON, --plan and explicit --test-environment yes; see [ACTIONS](../../../docs/ACTIONS.md). Audit real target semantics, stop after failed/uncertain actions, never automatically retry a dispatched action. Never treat this skill as permission to install tools or touch private app data. The private Backup command is separate from Evidence/Support and requires the user's corresponding task scope.
