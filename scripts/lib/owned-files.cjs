// Generated from owned-files.cts by TypeScript 6.0.2; source-lf-sha256=2327b6246faa6a8fe5d8410f90f18dabdaf6ab26f740b5e9ba4f70d66d73c695
"use strict";
// Shared ownership checks for staging; never recursively delete unknown paths.
const fs = require('node:fs');
// Windows Node 22 path and descriptor stats can disagree on dev; compare descriptor identities for files.
function fileStat(file) { const fd = fs.openSync(file, 'r'); try {
    return fs.fstatSync(fd, { bigint: true });
}
finally {
    fs.closeSync(fd);
} }
// Track actual inodes. Never recursively remove a possibly shared/replaced directory.
function owned() {
    const files = new Map(), dirs = new Map();
    const same = (a, b) => a.dev === b.dev && a.ino === b.ino;
    return {
        mkdir(dir) { fs.mkdirSync(dir, { mode: 0o700 }); dirs.set(dir, fs.lstatSync(dir, { bigint: true })); },
        adopt(dir) { dirs.set(dir, fs.lstatSync(dir, { bigint: true })); },
        write(file, bytes) { const fd = fs.openSync(file, 'wx', 0o600); try {
            const item = { stat: fs.fstatSync(fd, { bigint: true }), bytes: Buffer.from(bytes), partial: true };
            files.set(file, item);
            fs.writeFileSync(fd, bytes);
            item.partial = false;
        }
        finally {
            fs.closeSync(fd);
        } },
        link(source, file, bytes) { fs.linkSync(source, file); files.set(file, { stat: fileStat(file), bytes: Buffer.from(bytes) }); },
        cleanup() {
            let complete = true;
            for (const [dir, stat] of dirs)
                try {
                    const current = fs.lstatSync(dir, { bigint: true });
                    if (!current.isDirectory() || !same(current, stat))
                        return false;
                }
                catch (error) {
                    if (error?.code !== 'ENOENT')
                        return false;
                }
            for (const [file, item] of [...files].reverse())
                try {
                    if (!fs.lstatSync(file).isFile() || !same(fileStat(file), item.stat)) {
                        complete = false;
                        continue;
                    }
                    const data = fs.readFileSync(file);
                    if (!data.equals(item.bytes) && !(item.partial && data.length <= item.bytes.length && data.equals(item.bytes.subarray(0, data.length)))) {
                        complete = false;
                        continue;
                    }
                    fs.unlinkSync(file);
                }
                catch (error) {
                    if (error?.code !== 'ENOENT')
                        complete = false;
                }
            for (const [dir, stat] of [...dirs].reverse())
                try {
                    const current = fs.lstatSync(dir, { bigint: true });
                    if (!current.isDirectory() || !same(current, stat)) {
                        complete = false;
                        continue;
                    }
                    fs.rmdirSync(dir);
                }
                catch (error) {
                    if (error?.code !== 'ENOENT')
                        complete = false;
                }
            return complete;
        }
    };
}
const api = { owned };
module.exports = api;
