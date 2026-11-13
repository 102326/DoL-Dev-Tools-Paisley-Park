param([Parameter(Mandatory)][ValidatePattern('^run-[a-f0-9]{32}$')][string]$RunName)
$ErrorActionPreference = 'Stop'
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$run = Join-Path $project "artifacts/skill-intelligence-7.1/file-lifecycle-1.0/$RunName"
$source = Join-Path $run 'retained-source'
$copy = Join-Path $run 'working-copy'
$node = (Get-Command node -CommandType Application | Select-Object -First 1).Source
$names = @('index.html', 'build.cjs', 'deploy.cjs')
$files = @('index.html', 'build.cjs', 'deploy.cjs', 'dist/index.html', 'deployed/index.html')
$dirs = @('dist', 'deployed', '.')
$events = [Collections.Generic.List[object]]::new()
$identityJs = @'
const fs=require('node:fs'),crypto=require('node:crypto'),p=process.argv[1];
let s=fs.lstatSync(p,{bigint:true}),sha256=null;
if(s.isFile()){const fd=fs.openSync(p,'r');try{s=fs.fstatSync(fd,{bigint:true});sha256=crypto.createHash('sha256').update(fs.readFileSync(fd)).digest('hex')}finally{fs.closeSync(fd)}}
else if(!s.isDirectory())throw Error('Non-regular fixture entry');
console.log(JSON.stringify({type:s.isFile()?'file':'directory',dev:String(s.dev),ino:String(s.ino),links:String(s.nlink),bytes:String(s.size),sha256}));
'@
function Require($Condition, [string]$Message) { if (!$Condition) { throw $Message } }
function No-Reparse([string]$Path) {
    $absolute = [IO.Path]::GetFullPath($Path)
    for ($cursor = $absolute; $cursor; $cursor = [IO.Path]::GetDirectoryName($cursor)) {
        try { $item = Get-Item -LiteralPath $cursor -Force }
        catch [System.Management.Automation.ItemNotFoundException] { continue }
        Require (-not ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) "Reparse point: $cursor"
    }
    return $absolute
}
function In-Run([string]$Path) {
    $absolute = [IO.Path]::GetFullPath($Path)
    Require ($absolute.StartsWith($run + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) 'Outside this run'
    return No-Reparse $absolute
}
function Identity([string]$Path) {
    [void](In-Run $Path)
    $text = & $node -e $identityJs $Path
    Require ($LASTEXITCODE -eq 0) 'Identity read failed'
    return $text | ConvertFrom-Json
}
function Event([string]$Name, $Data) { $events.Add(@{event=$Name; data=$Data}) }
function Exact-Copy([string]$ExpectedHtmlHash) {
    [void](In-Run $copy)
    $actual = @(Get-ChildItem -LiteralPath $copy -Force | ForEach-Object { [void](In-Run $_.FullName); $_.Name })
    Require (@(Compare-Object $actual @('index.html', 'build.cjs', 'deploy.cjs', 'dist', 'deployed')).Count -eq 0) 'Unexpected copy entries'
    foreach ($dir in @('dist', 'deployed')) {
        $children = @(Get-ChildItem -LiteralPath (In-Run (Join-Path $copy $dir)) -Force)
        Require ($children.Count -eq 1 -and $children[0].Name -eq 'index.html') 'Unexpected generated entries'
    }
    $snapshot = [ordered]@{}
    foreach ($name in $files) {
        $state = Identity (Join-Path $copy $name)
        $expected = if ($name -like '*.html') { $ExpectedHtmlHash } else { $sourceHashes[$name] }
        Require ($state.type -eq 'file' -and $state.links -eq '1' -and $state.sha256 -eq $expected) "Unexpected file: $name"
        $snapshot[$name] = $state
    }
    foreach ($name in $dirs) {
        $state = Identity (Join-Path $copy $name)
        Require ($state.type -eq 'directory') 'Expected directory'
        $snapshot["dir:$name"] = $state
    }
    return $snapshot
}
function Cleanup-Target([string]$Path) {
    $absolute = In-Run $Path
    $allowed = @($files | ForEach-Object { [IO.Path]::GetFullPath((Join-Path $copy $_)) })
    Require ($allowed -contains $absolute) 'Outside exact generated file set'
    return $absolute
}
function Clear-Copy($Recorded, [string]$ExpectedHtmlHash, [string]$Phase) {
    $current = Exact-Copy $ExpectedHtmlHash
    foreach ($key in $Recorded.Keys) {
        Require ($Recorded[$key].dev -eq $current[$key].dev -and $Recorded[$key].ino -eq $current[$key].ino) 'Copy identity changed'
    }
    foreach ($name in $files) {
        $absolute = Cleanup-Target (Join-Path $copy $name)
        $now = Identity $absolute
        Require ($now.dev -eq $Recorded[$name].dev -and $now.ino -eq $Recorded[$name].ino -and $now.links -eq '1' -and $now.sha256 -eq $Recorded[$name].sha256) 'File changed before removal'
        Event 'pre-delete' @{phase=$Phase; absolute=$absolute; state=$now}
        Remove-Item -LiteralPath $absolute
        Require (-not (Test-Path -LiteralPath $absolute)) 'File remains after removal'
    }
    foreach ($name in $dirs) {
        $absolute = In-Run (Join-Path $copy $name)
        $now = Identity $absolute
        Require ($now.dev -eq $Recorded["dir:$name"].dev -and $now.ino -eq $Recorded["dir:$name"].ino) 'Directory changed before removal'
        Require (@(Get-ChildItem -LiteralPath $absolute -Force).Count -eq 0) 'Directory not empty'
        Remove-Item -LiteralPath $absolute
    }
    Require (-not (Test-Path -LiteralPath $copy)) 'Copy remains after cleanup'
    Event 'copy-absent' @{phase=$Phase; absolute=$copy}
}
function Copy-Source {
    [void](In-Run $copy)
    [void][IO.Directory]::CreateDirectory($copy)
    foreach ($name in $names) {
        $from = In-Run (Join-Path $source $name)
        Require ((Identity $from).sha256 -eq $sourceHashes[$name]) 'Recovery source changed'
        [IO.File]::Copy($from, (In-Run (Join-Path $copy $name)), $false)
    }
}
function Build-Deploy([string]$Phase) {
    foreach ($name in @('build.cjs', 'deploy.cjs')) {
        $script = In-Run (Join-Path $copy $name)
        Require ((Identity $script).sha256 -eq $sourceHashes[$name]) 'Reviewed script changed'
        $output = & $node $script 2>&1
        Require ($LASTEXITCODE -eq 0) "Workshop process failed: $name"
        Require (-not $output) 'Unexpected Workshop output'
        Event 'process-completed' @{phase=$Phase; script=$name; exitCode=$LASTEXITCODE}
    }
}

Require (-not $env:NODE_OPTIONS -and -not $env:NODE_PATH) 'Unexpected Node preload/module environment'
[void](No-Reparse $run)
Require (-not (Test-Path -LiteralPath $run)) 'Existing run preserved'
[void][IO.Directory]::CreateDirectory($source)
$report = @{scope='synthetic file-copy lifecycle only'; run=$run; sourceCommit=(& git -C $project rev-parse HEAD); experimentScriptSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash; node=(& $node --version); powershell=$PSVersionTable.PSVersion.ToString(); events=$events; status='started'}
try {
    $sourceHashes = [ordered]@{}
    foreach ($name in $names) {
        $from = No-Reparse (Join-Path $project "examples/workshop/$name")
        $blob = & git -C $project rev-parse "HEAD:examples/workshop/$name"
        $actual = & git -C $project hash-object "--path=examples/workshop/$name" $from
        Require ($LASTEXITCODE -eq 0 -and $actual -eq $blob) 'Source differs from reviewed commit'
        [IO.File]::Copy($from, (In-Run (Join-Path $source $name)), $false)
        $sourceHashes[$name] = (Identity (Join-Path $source $name)).sha256
    }
    Event 'scope-recorded' @{sourceHashes=$sourceHashes; data='three reviewed Workshop files; no game/private input, account/cloud API or browser execution'; authority='current user authorizes this new synthetic copy lifecycle, not other targets'; cleanupFiles=$files; recovery='retained exact source plus existing build/deploy scripts'}
    Copy-Source
    Build-Deploy 'initial'
    $initial = Exact-Copy $sourceHashes['index.html']
    Event 'initial-built' $initial

    # A controlled input change invalidates output evidence, not the existing scope.
    $input = In-Run (Join-Path $copy 'index.html')
    $html = [IO.File]::ReadAllText($input)
    Require ([regex]::Matches($html, 'width:20px').Count -eq 1) 'Unexpected fixture input'
    [IO.File]::WriteAllText($input, $html.Replace('width:20px', 'width:24px'), [Text.UTF8Encoding]::new($false))
    $changedHash = (Identity $input).sha256
    Require ($changedHash -ne $sourceHashes['index.html']) 'Input did not change'
    Event 'changed-boundary' @{changed='copy HTML bytes and derived output'; reused='same authorization, synthetic provenance, reviewed scripts and no account/cloud functionality'}
    Build-Deploy 'changed-input'
    $changed = Exact-Copy $changedHash
    Event 'changed-built' $changed

    $refused = $false
    try { [void](Cleanup-Target (Join-Path $source 'index.html')) }
    catch { Require ($_.Exception.Message -eq 'Outside exact generated file set') 'Unexpected guard failure'; $refused = $true }
    Require $refused 'Source guard did not reject'
    Require ((Identity (Join-Path $source 'index.html')).sha256 -eq $sourceHashes['index.html']) 'Source guard changed data'
    Event 'source-cleanup-refused' @{layer='experiment exact-set assertion, not a host/tool rejection'; sideEffect=$false}

    Clear-Copy $changed $changedHash 'rebuild'
    Copy-Source
    Build-Deploy 'recovered'
    $recovered = Exact-Copy $sourceHashes['index.html']
    Event 'recovered' $recovered
    Clear-Copy $recovered $sourceHashes['index.html'] 'final-cleanup'
    foreach ($name in $names) { Require ((Identity (Join-Path $source $name)).sha256 -eq $sourceHashes[$name]) 'Retained source changed' }
    $report.status = 'passed'
    $report.sourceHashes = $sourceHashes
    $report.retained = @('retained-source/index.html', 'retained-source/build.cjs', 'retained-source/deploy.cjs', 'report.json')
} catch {
    $report.status = 'failed'
    $report.error = $_.Exception.Message
    throw
} finally {
    [void](In-Run (Join-Path $run 'report.json'))
    $report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $run 'report.json') -Encoding utf8
}
$report | Select-Object status, scope, sourceCommit, node, powershell, retained | ConvertTo-Json -Depth 4
