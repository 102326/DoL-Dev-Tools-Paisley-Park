#!/bin/sh
set -eu
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
root=$(CDPATH= cd -- "$here/../../.." && pwd)
compiler="$root/artifacts/weather-report-20261104/kotlin/compiler"
build="$root/artifacts/weather-report-20261104/kotlin/build"
(cd "$compiler" && shasum -a 256 -c "$here/compiler.sha256")
mkdir -p "$build"
java -cp "$compiler/*" org.jetbrains.kotlin.cli.jvm.K2JVMCompiler -no-stdlib -no-reflect -jvm-target 17 -classpath "$compiler/kotlin-stdlib-2.0.21.jar" -d "$build" "$here/Weather.kt" "$here/Main.kt" "$here/Worker.kt"
java -cp "$build:$compiler/kotlin-stdlib-2.0.21.jar" weather.MainKt

node "$here/process-test.cjs" "$build:$compiler/kotlin-stdlib-2.0.21.jar"
