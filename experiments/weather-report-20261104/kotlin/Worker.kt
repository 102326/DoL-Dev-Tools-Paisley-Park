package weather

import java.nio.file.Files
import java.nio.file.Path

// One work item per worker. Frames are ASCII lines, max 256 bytes and 16 requests.
private fun line(): String? {
    val b = StringBuilder()
    while (true) {
        val c = System.`in`.read()
        if (c < 0) return if (b.isEmpty()) null else error("truncated frame")
        if (c == 10) return b.toString()
        require(c in 32..126 && b.length < 256) { "invalid frame" }
        b.append(c.toChar())
    }
}
fun main(args: Array<String>) {
    require(args.size == 2)
    val dir = Path.of(args[0]); val run = args[1]
    val store = AtomicFileStore(dir.resolve("effects"))
    val core = WeatherCore(run, store)
    var activity = core.create()
    var ticket: Ticket? = null
    var worker: Thread? = null
    var lastId = 0
    for (request in 1..16) {
        val frame = line() ?: break
        val parts = frame.split(' ')
        require(parts.size in 2..3 && parts[0].matches(Regex("[1-9][0-9]{0,2}")))
        val id = parts[0].toInt(); require(id > lastId); lastId = id
        val response = when (parts[1]) {
            "HELLO" -> { require(parts.size == 2); "OK ${core.processStartId} ${activity.activityInstanceId}" }
            "START" -> {
                require(parts.size == 3 && parts[2].matches(Regex("[A-Za-z0-9_-]{1,32}")) && ticket == null && worker == null)
                ticket = core.begin(activity, parts[2]); "OK ${activity.activityInstanceId}"
            }
            "RECREATE" -> {
                require(parts.size == 2 && worker == null)
                core.lifecycle(activity, "stopped"); core.lifecycle(activity, "destroyed")
                activity = core.create(); "OK ${activity.activityInstanceId}"
            }
            "ARM" -> {
                require(parts.size == 2 && ticket != null && worker == null)
                val saved = ticket!!
                worker = Thread {
                    val gate = dir.resolve("release")
                    val limit = System.nanoTime() + 15_000_000_000L
                    while (!Files.exists(gate) && System.nanoTime() < limit) Thread.sleep(10)
                    if (Files.exists(gate) && core.finish(saved) is Outcome.Committed) {
                        Files.writeString(dir.resolve("committed"), "done")
                        while (!Files.exists(dir.resolve("exit")) && System.nanoTime() < limit) Thread.sleep(10)
                    }
                }.also { it.start() }
                "READY"
            }
            "LOOKUP" -> {
                require(parts.size == 3 && worker == null && parts[2].matches(Regex("[A-Za-z0-9_-]{1,32}")))
                when (val found = core.lookup(parts[2])) {
                    is Outcome.Committed -> "COMMITTED ${found.ticket.identity.processStartId} ${found.ticket.identity.activityInstanceId} ${found.ticket.workId}"
                    Outcome.Unknown -> "UNKNOWN"
                }
            }
            else -> error("invalid command")
        }
        println("$id $response")
    }
    worker?.join(16_000)
}
