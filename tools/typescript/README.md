# TypeScript developer build

Node sources compile to the existing CommonJS paths. Installed users run the checked-in CJS and browser JS; this directory and authoritative TS are excluded from the runtime archive. Root dependencies and Node requirements do not change.

```sh
npm ci --prefix tools/typescript --ignore-scripts --no-audit --no-fund
node tools/typescript/build.cjs --check
node tools/typescript/check-types.cjs
node --test tools/typescript/test/*.test.cjs
# Only after reviewing an intentional authoritative source edit:
node tools/typescript/build.cjs --write-production
```

`tsconfig.json` lists the authoritative CTS entry files. TypeScript6.0.2 checks and emits the complete Program in memory, with strict and noEmitOnError. The default config itself has noEmit, so direct tsc checking does not overwrite runtime files. Outputs have LF-normalized source digests and full-byte comparison; checkout CRLF is accepted. `source-find.mts` is a generated comparison input for the existing opt-in native experiment; its source of truth is `source-find.cts`. It is not an ESM product entry or a second implementation.

The leaf modules use standard TypeScript `export =` to retain the exact existing CJS export shape, without adding an `__esModule` marker. Unlike the earlier native-stripping experiment, this compiled build permits that syntax and therefore does not set erasableSyntaxOnly. It does not introduce runtime enums, decorators or a runtime TS loader. Node types stay at the existing locked25.9.5; their presence does not prove support for every Node26 API. Exact minimum-Node runtime evidence remains required.

`--check` is read-only and never cleans an output directory. Generation first validates the entire emission, then stages and verifies every changed artifact and backup on its destination filesystem. It preserves existing permission modes (new outputs default0644), coordinates cooperating builders using exclusive `.paisley-ts-build-lock`, rechecks captured source inputs and publishes the known outputs. On an ordinary later publication failure, it restores earlier outputs only while their observed identities and bytes still match. Unknown peer changes keep their bytes and retain backups for recovery.

This is not an atomic multi-file transaction or a filesystem compare-and-swap. Arbitrary external editors can race between checks and rename; do not edit generated outputs during generation. The lock coordinates this generator, not every process on the computer. No automatic stale-lock removal, PID-based ownership guessing, recursive sweep or permission workaround is performed. If interrupted or cleanup is uncertain, preserve the output/staging/lock, inspect ownership and retained backups, then use a verified new checkout or explicitly reviewed recovery before generating again. A check can safely report drift while another writer publishes; it does not adopt that partially published set as valid.

The existing `PAISLEY_TSC` and `PAISLEY_TYPE_ROOTS` process overrides accept a reviewed matching compiler/type tree. No global installation or configuration is changed. Old experiment commands delegate here; installing the formal tool package is preferred over maintaining separate experiment dependencies.
