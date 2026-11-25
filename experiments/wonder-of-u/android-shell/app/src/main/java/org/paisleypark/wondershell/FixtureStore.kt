package org.paisleypark.wondershell

import android.util.AtomicFile
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.MessageDigest
import java.util.zip.ZipInputStream

internal class FixtureStore(private val files: File) {
    internal data class Fixture(val sha256: String, val members: Map<String, ByteArray>)

    private val pointer = AtomicFile(File(files, "fixture-active.zip"))
    val inbox = File(files, "fixture-inbox.zip")

    private fun bounded(incoming: java.io.InputStream, maximum: Int): ByteArray {
        val output = ByteArrayOutputStream()
        val chunk = ByteArray(16384)
        while (true) {
            val size = incoming.read(chunk)
            if (size < 0) break
            check(output.size() + size <= maximum)
            output.write(chunk, 0, size)
        }
        return output.toByteArray()
    }

    private fun parse(bytes: ByteArray): Fixture {
        val decoded = linkedMapOf<String, ByteArray>()
        ZipInputStream(ByteArrayInputStream(bytes)).use { zip ->
            while (true) {
                val entry = zip.nextEntry ?: break
                check(!entry.isDirectory && entry.name in supported && entry.name !in decoded)
                decoded[entry.name] = bounded(zip, 1024 * 1024)
                zip.closeEntry()
            }
        }
        check(decoded.keys.containsAll(setOf("index.html", "release.js")))
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
        return Fixture(digest, decoded)
    }

    fun readActive(): Fixture? {
        return try { pointer.openRead().use { parse(bounded(it, 4 * 1024 * 1024)) } }
        catch (_: java.io.FileNotFoundException) { null }
    }

    fun activate(): Fixture {
        // Read, validate and activate the same bytes. An invalid staged file leaves the old fixture active.
        val bytes = inbox.inputStream().use { bounded(it, 4 * 1024 * 1024) }
        val reviewed = parse(bytes)
        val fd = pointer.startWrite()
        try { fd.write(bytes); pointer.finishWrite(fd) }
        catch (error: Exception) { pointer.failWrite(fd); throw error }
        return reviewed
    }

    companion object {
        val supported = setOf("index.html", "release.js", "styles.css")
    }
}
