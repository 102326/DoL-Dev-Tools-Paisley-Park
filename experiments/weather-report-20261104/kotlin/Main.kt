package weather

import java.nio.file.Files
import java.util.concurrent.Callable
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

fun main() {
    val dir = Files.createTempDirectory("weather-jvm-")
    try {
        val store = AtomicFileStore(dir)
        val core = WeatherCore("run1", store)
        val old = core.create(); core.lifecycle(old, "started")
        val ticket = core.begin(old, "work1")
        val gate = CountDownLatch(1)
        val executor = Executors.newSingleThreadScheduledExecutor()
        val result = executor.schedule(Callable { gate.await(); core.finish(ticket) }, 500, TimeUnit.MILLISECONDS)
        core.lifecycle(old, "stopped"); core.lifecycle(old, "destroyed")
        val fresh = core.create(); core.lifecycle(fresh, "started")
        check(old.processStartId == fresh.processStartId && old.activityInstanceId != fresh.activityInstanceId)
        check(core.lookup("work1") == Outcome.Unknown)
        core.disconnect()
        gate.countDown()
        check(result.get(5, TimeUnit.SECONDS) == Outcome.Committed(ticket))
        executor.shutdown()
        check(core.read(0).isEmpty())
        check(core.readWindow(0) == null)
        core.reconnect()
        val commit = core.read(0).single { it.phase == "workCommitted" }
        check(commit.identity == old && commit.identity != fresh && commit.workId == "work1")
        check(core.lookup("work1") == Outcome.Committed(ticket))
        check(core.finish(core.begin(fresh, "work1")) == Outcome.Committed(ticket))
        check(core.finish(ticket) == Outcome.Committed(ticket))
        check(core.read(0).count { it.phase == "workCommitted" } == 1)
        val restart = WeatherCore("run1", store)
        check(restart.processStartId != old.processStartId)
        check(restart.lookup("work1") == Outcome.Committed(ticket))
        val failing = object : CommitStore {
            override fun commit(ticket: Ticket) = Outcome.Unknown
            override fun lookup(runId: String, workId: String) = Outcome.Unknown
        }
        val uncertain = WeatherCore("run2", failing)
        check(uncertain.finish(uncertain.begin(uncertain.create(), "w")) == Outcome.Unknown)
        check(uncertain.read(0).none { it.phase == "workCommitted" })
        val throwing = object : CommitStore {
            override fun commit(ticket: Ticket): Outcome = error("commit failure")
            override fun lookup(runId: String, workId: String): Outcome = error("lookup failure")
        }
        val fault = WeatherCore("run4", throwing)
        check(fault.finish(fault.begin(fault.create(), "w")) == Outcome.Unknown)
        check(fault.read(0).none { it.phase == "workCommitted" })
        val legacy = WeatherCore("legacy", store)
        legacy.create()
        check(legacy.read(-1).map { it.seq } == listOf(1L))
        check(legacy.read(99).isEmpty())
        legacy.disconnect()
        check(legacy.read(-1).isEmpty() && legacy.read(99).isEmpty())
        val bounded = WeatherCore("run3", store, 2)
        val activity = bounded.create(); bounded.lifecycle(activity, "started"); bounded.lifecycle(activity, "stopped")
        check(bounded.read(0).map { it.seq } == listOf(2L, 3L))
        val gap = checkNotNull(bounded.readWindow(0))
        check(gap.latestSeq == 3L && gap.gap && gap.events.map { it.seq } == listOf(2L, 3L))
        check(checkNotNull(bounded.readWindow(1)).gap.not())
        check(checkNotNull(bounded.readWindow(3)).events.isEmpty())
        check(runCatching { bounded.readWindow(4) }.isFailure)
        println("PASS: recreation, original attribution, atomic file witness, late result, disconnect, duplicate, restart, unknown, bounded events and gap reporting")
        println("HOST: work1 committed by ${old.activityInstanceId}; current ${fresh.activityInstanceId}; same process ${old.processStartId}")
    } finally {
        Files.walk(dir).use { paths -> paths.sorted(Comparator.reverseOrder()).forEach { Files.deleteIfExists(it) } }
    }
}
