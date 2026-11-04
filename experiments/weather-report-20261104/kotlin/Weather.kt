package weather

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption.ATOMIC_MOVE
import java.util.UUID

data class Identity(val runId: String, val processStartId: String, val activityInstanceId: String)
data class Ticket(val identity: Identity, val workId: String)
data class Event(val seq: Long, val identity: Identity, val phase: String, val workId: String? = null)
sealed interface Outcome {
    data class Committed(val ticket: Ticket) : Outcome
    data object Unknown : Outcome
}

// A store must make commit idempotent for a work key and return a witness only
// for an atomic business commit that it can read back; Unknown cannot prove absence.
interface CommitStore {
    fun commit(ticket: Ticket): Outcome
    fun lookup(runId: String, workId: String): Outcome
}

// Experiment only: one writer and a private temporary directory. A published file IS the
// synthetic business effect and witness. Atomic rename is required; no fallback to a split log.
class AtomicFileStore(private val directory: Path) : CommitStore {
    init { Files.createDirectories(directory) }
    private fun file(runId: String, workId: String): Path {
        require(runId.matches(Regex("[A-Za-z0-9_-]+")) && workId.matches(Regex("[A-Za-z0-9_-]+")))
        return directory.resolve("$runId.$workId")
    }
    override fun commit(ticket: Ticket): Outcome {
        val target = file(ticket.identity.runId, ticket.workId)
        if (Files.exists(target)) return lookup(ticket.identity.runId, ticket.workId)
        if (!Files.notExists(target)) return Outcome.Unknown
        var temp: Path? = null
        return try {
            temp = Files.createTempFile(directory, "pending-", ".tmp")
            val i = ticket.identity
            require(listOf(i.processStartId, i.activityInstanceId).all { it.matches(Regex("[A-Za-z0-9_-]+")) })
            Files.writeString(temp, listOf(i.runId, i.processStartId, i.activityInstanceId, ticket.workId).joinToString("\n"))
            Files.move(temp, target, ATOMIC_MOVE)
            lookup(i.runId, ticket.workId)
        } catch (_: Exception) { Outcome.Unknown } finally { temp?.let { runCatching { Files.deleteIfExists(it) } } }
    }
    override fun lookup(runId: String, workId: String): Outcome = try {
        val fields = Files.readAllLines(file(runId, workId))
        if (fields.size != 4 || fields[0] != runId || fields[3] != workId || fields.any { !it.matches(Regex("[A-Za-z0-9_-]+")) }) Outcome.Unknown
        else Outcome.Committed(Ticket(Identity(fields[0], fields[1], fields[2]), fields[3]))
    } catch (_: Exception) { Outcome.Unknown }
}

// All calls must be serialized by the app adapter. Epoch/connection only gates delivery,
// never the underlying ticket. Activity instances get fresh IDs, including after recreation.
class WeatherCore(private val runId: String, private val store: CommitStore, private val capacity: Int = 64) {
    init { require(capacity > 0) }
    val processStartId = UUID.randomUUID().toString()
    private var seq = 0L
    private val events = ArrayDeque<Event>()
    private var connected = true
    fun create(): Identity = Identity(runId, processStartId, UUID.randomUUID().toString()).also { event(it, "created") }
    fun lifecycle(identity: Identity, phase: String) {
        require(identity.runId == runId && identity.processStartId == processStartId)
        require(phase in setOf("started", "stopped", "destroyed"))
        event(identity, phase)
    }
    fun begin(identity: Identity, workId: String): Ticket {
        require(identity.runId == runId && identity.processStartId == processStartId)
        return Ticket(identity, workId)
    }
    fun finish(ticket: Ticket): Outcome {
        require(ticket.identity.runId == runId && ticket.identity.processStartId == processStartId)
        val existing = try { store.lookup(runId, ticket.workId) } catch (_: Exception) { Outcome.Unknown }
        if (existing is Outcome.Committed) return existing
        val result = try { store.commit(ticket) } catch (_: Exception) { Outcome.Unknown }
        if (result is Outcome.Committed && result.ticket == ticket) event(ticket.identity, "workCommitted", ticket.workId)
        return result
    }
    fun disconnect() { connected = false }
    fun reconnect() { connected = true }
    fun read(after: Long): List<Event> = if (connected) events.filter { it.seq > after } else emptyList()
    fun lookup(workId: String): Outcome = store.lookup(runId, workId)
    private fun event(identity: Identity, phase: String, workId: String? = null) {
        events.addLast(Event(++seq, identity, phase, workId))
        if (events.size > capacity) events.removeFirst()
    }
}
