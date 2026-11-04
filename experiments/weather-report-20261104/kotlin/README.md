# Weather Report: Kotlin/JVM first experiment

Run from the repository root with `experiments/weather-report-20261104/kotlin/run.sh`. Java 21 was used; the compiler targets JVM 17. The script checks the pinned SHA-256 values in `compiler.sha256`, compiles the Kotlin sources and runs both host drivers. The compiler jars live only under `artifacts/weather-report-20261104/kotlin/compiler/`; the compiled classes go to the adjacent `build/` directory. No global installation is used.

The host schedules a synthetic 500 ms job, explicitly orders recreation and disconnect before releasing it, then retrieves its result. The independently persisted file is the synthetic business effect and its witness: a temporary file is atomically renamed before a committed outcome is returned. Recovery reads that same file. `workCommitted` is emitted only after readback and carries the original ticket's run, process-start and Activity-instance IDs. Unknown is retained for failure or missing proof. Disconnect affects event delivery only. The bounded event stream has monotonically increasing sequence numbers; readers must detect gaps and treat missing history as unknown. A duplicate work ID reports the original owner rather than attributing it to the new instance.

`CommitStore` is the adapter boundary, not an Android implementation: a real app must use its own actual business transaction with an atomic, recoverable witness, or report Unknown. It must serialize core access, create fresh IDs at the real lifecycle boundaries, and arrange actual work ownership independently of the transport. This prototype uses a private directory and one writer; concurrent/multiprocess commits, filesystem crash durability/fsync, malformed external inputs, actual Android lifecycle ordering, bounded file retention and a production transport protocol are not established. Atomic rename failure remains Unknown. Neither lack of an event nor lack of a file proves non-commit. The 500 ms driver is a JVM scenario, not ADB or performance evidence.

## Evidence, 2026-11-04

- OpenJDK 21.0.11; Kotlin compiler 2.0.21; JVM target 17.
- The run command compiled and printed PASS for recreation, attribution, atomic file witness and readback, late result, disconnected completion, duplicate, simulated process restart, Unknown, and bounded event sequence.
- One earlier host-driver run failed: Kotlin selected the `Runnable` scheduler overload and returned null; selecting `Callable` corrected the driver and the above command passed. This was not a proven failure of the core.
- Android SDK, APK compilation, Android Activity, ADB, physical device, actual Android process death and Windows have not been validated. There is no ADB/Node performance comparison.

## Compiler provenance

Artifacts were downloaded from `https://repo.maven.apache.org/maven2/` on 2026-11-04, and each local SHA-1 matched the Maven Central `.sha1` at download; `compiler.sha256` pins the resulting files for reruns. Total directory size was 64 MiB. Coordinates (group : artifact : version):

- org.jetbrains.kotlin : kotlin-compiler-embeddable : 2.0.21
- org.jetbrains.kotlin : kotlin-stdlib : 2.0.21
- org.jetbrains.kotlin : kotlin-script-runtime : 2.0.21
- org.jetbrains.kotlin : kotlin-reflect : 1.6.10
- org.jetbrains.kotlin : kotlin-daemon-embeddable : 2.0.21
- org.jetbrains.intellij.deps : trove4j : 1.0.20200330
- org.jetbrains.kotlinx : kotlinx-coroutines-core-jvm : 1.6.4
- org.jetbrains : annotations : 13.0

The compiler's published POM declares its runtime dependencies; annotations is additionally required by generated JVM code. Matching a checksum served by the same repository detects transfer corruption but is not independent signature verification. Jars may need to be reacquired from these pinned coordinates if the artifact directory is not transferred; validate the SHA-256 list before execution.

## Independent JVM process experiment

The same `run.sh` also runs `process-test.cjs` using the Node standard library and a separate JVM `Worker.kt`. The host sends ASCII line frames with monotonically increasing numeric request IDs; one outstanding request, at most 16 requests, 256 bytes per input/output frame, a bounded 512-character host receive buffer, and one work item per worker. Invalid or oversized input terminates the worker. This is an experiment-specific control channel, not a general transport or Android service. The worker retains an armed ticket after stdin EOF; its finite deadline prevents an abandoned worker from waiting indefinitely.

A file gate makes ordering explicit: after `ARM` returns `READY`, the host kills the first real JVM without opening the gate, verifies the effect file is absent, starts a new JVM with a different process UUID, and obtains `UNKNOWN` for that work. Absence is not a proof of no business commit. In the second scenario the host closes stdin, releases the gate, waits for a post-commit marker, independently reads the synthetic effect file and checks its original process/activity UUID, then sends `SIGKILL` while the post-commit gate holds the worker alive. A fresh JVM obtains the original committed ticket. The JVM's replacement activity UUID differs from the original; its process UUID remains the same before the restart. Polling waits for explicit markers with deadlines; the test does not infer phase from a sleep. The test removes its own temporary files only after all child processes close; if termination remains unknown after the cleanup deadline, it reports and retains the directory.

The core now suppresses duplicate `workCommitted` events on repeated finish once the witness exists, maps store exceptions to Unknown, and treats cleanup as best effort without overriding the commit result. Commit stores must provide idempotent work keys. The file implementation assumes one writer, does not fsync, and cannot establish power-loss durability; a real Android business transaction needs its own atomic witness. Kills *during* the filesystem rename, real Android process lifecycle, real device transport, security against hostile local filesystem manipulation, and business effects in other apps are not demonstrated. stdin EOF here models losing this control connection, not every kind of network or process failure.

On 2026-11-04 the complete run passed its JVM checks and both real SIGKILL paths; it also rejected an oversized frame (the expected invalid-frame exception is printed by that worker). The first cross-process attempt exposed that the completed worker could exit naturally before SIGKILL; the explicit post-commit holding gate fixed that test design, and the complete run passed afterward. This is functional evidence, not an ADB performance comparison.
