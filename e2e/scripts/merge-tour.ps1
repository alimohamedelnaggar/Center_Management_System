param(
    [string[]]$Slugs,
    [string]$OutputName = 'center-management-full-tour.mp4',
    [string]$DocsPath,
    [switch]$SkipMerge
)

$ErrorActionPreference = 'Stop'

# PowerShell 5.1 on Windows and pwsh on Linux both read this file as UTF-8 only
# with a BOM, and native output is decoded with the console encoding.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Forward slash on purpose: Join-Path must produce a path that resolves on both
# Windows and Linux, and '\' is a literal filename character on Linux.
$repoRoot = (Resolve-Path (Join-Path (Join-Path $PSScriptRoot '..') '..')).Path
$e2eDir = Join-Path $repoRoot 'e2e'
$artifactRoot = Join-Path $e2eDir 'artifacts'
$outputPath = Join-Path $artifactRoot $OutputName
if (-not $DocsPath) { $DocsPath = Join-Path (Join-Path $repoRoot 'docs') 'chapters.md' }
$tempDir = [System.IO.Path]::GetTempPath()
$invariant = [System.Globalization.CultureInfo]::InvariantCulture
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# Fixed recording order. Each entry is one independently recorded part.
if (-not $Slugs -or $Slugs.Count -eq 0) {
    $Slugs = @(
        'stage-c-superadmin',
        'stage-c-centerowner',
        'stage-c-teacher',
        'stage-c-assistant',
        'stage-c-student',
        'stage-c-parent',
        'stage-c-solo'
    )
}

$parts = @()
foreach ($slug in $Slugs) {
    $partPath = Join-Path (Join-Path $artifactRoot $slug) "part-$slug.mp4"
    $partMetaPath = Join-Path (Join-Path $artifactRoot $slug) 'part-meta.json'
    if (-not (Test-Path $partPath)) { throw "Missing part: $partPath" }
    if (-not (Test-Path $partMetaPath)) { throw "Missing part metadata: $partMetaPath" }

    $partMeta = Get-Content $partMetaPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $durationText = & ffprobe -v error -select_streams v:0 -show_entries format=duration -of default=nw=1:nk=1 $partPath
    $durationSec = [double]::Parse($durationText.Trim(), $invariant)
    $streamInfo = (& ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,profile,width,height,pix_fmt,r_frame_rate -of csv=p=0 $partPath).Trim()

    $parts += [pscustomobject]@{
        slug       = $slug
        role       = $partMeta.role
        label      = $partMeta.roleLabel
        path       = $partPath
        meta       = $partMeta
        durationMs = [int][Math]::Round($durationSec * 1000)
        stream     = $streamInfo
    }
}

$signature = @($parts | ForEach-Object { $_.stream } | Select-Object -Unique)
if ($signature.Count -ne 1) {
    throw "Parts are not encoded identically: $($signature -join ' | ')"
}

$totalMs = ($parts | Measure-Object -Property durationMs -Sum).Sum
Write-Host ("Parts: {0}, total {1:hh\:mm\:ss}" -f $parts.Count, [TimeSpan]::FromMilliseconds($totalMs))

# Build the chapter track: every part's own chapter list, shifted by the exact
# concatenation offset implied by the real ffprobe durations above.
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add(';FFMETADATA1')
$lines.Add('title=Center Management System — full tour')

$offsetMs = 0
foreach ($part in $parts) {
    $index = 0
    foreach ($chapter in $part.meta.chapters) {
        $index++
        $start = $offsetMs + [int]$chapter.startMs
        $end = if ($index -lt $part.meta.chapters.Count) {
            $offsetMs + [int]$part.meta.chapters[$index].startMs
        }
        else {
            $offsetMs + $part.durationMs
        }
        $lines.Add('[CHAPTER]')
        $lines.Add('TIMEBASE=1/1000')
        $lines.Add("START=$start")
        $lines.Add("END=$end")
        $lines.Add("title=$($part.role) · $($chapter.id) — $($chapter.title)")
    }
    $offsetMs += $part.durationMs
}

$ffmetaPath = Join-Path $tempDir 'ffmeta-full-tour.txt'
# No BOM: ffmpeg rejects metadata files that start with one.
[System.IO.File]::WriteAllLines($ffmetaPath, $lines, $utf8NoBom)

if (-not $SkipMerge) {
    $listPath = Join-Path $tempDir 'full-tour-concat.txt'
    $listLines = $parts | ForEach-Object { "file '$(($_.path -replace '\\', '/'))'" }
    [System.IO.File]::WriteAllLines($listPath, $listLines, $utf8NoBom)

    if (Test-Path $outputPath) { Remove-Item $outputPath -Force }

    & ffmpeg -hide_banner -loglevel warning -f concat -safe 0 -i $listPath `
        -f ffmetadata -i $ffmetaPath `
        -map 0:v:0 -map_metadata 1 -map_chapters 1 `
        -c copy -movflags +faststart -an $outputPath
    if ($LASTEXITCODE -ne 0) { throw "ffmpeg merge failed with exit code $LASTEXITCODE" }
    Remove-Item $listPath -Force -ErrorAction SilentlyContinue
}
Remove-Item $ffmetaPath -Force -ErrorAction SilentlyContinue

if (-not (Test-Path $outputPath)) { throw "Merged file missing: $outputPath" }

# Everything below is read back from the merged file, never from the plan, so
# docs/chapters.md always matches what ffprobe reports.
$probeJson = & ffprobe -v error -print_format json -show_format -show_chapters -show_streams $outputPath
$probe = $probeJson | ConvertFrom-Json
$video = $probe.streams | Where-Object { $_.codec_type -eq 'video' } | Select-Object -First 1
$totalOutMs = [int][Math]::Round([double]::Parse($probe.format.duration, $invariant) * 1000)

$fmt = { param($ms) [TimeSpan]::FromMilliseconds($ms).ToString('hh\:mm\:ss') }

$rows = @()
$i = 0
foreach ($chapter in $probe.chapters) {
    $i++
    $startMs = [int][Math]::Round([double]::Parse($chapter.start_time, $invariant) * 1000)
    $endMs = [int][Math]::Round([double]::Parse($chapter.end_time, $invariant) * 1000)
    $role = ''
    foreach ($part in $parts) {
        if ($chapter.tags.title.StartsWith("$($part.role) · ")) { $role = $part.role }
    }
    $rows += [pscustomobject]@{
        index   = $i
        role    = $role
        label   = ($chapter.tags.title -replace '^[A-Za-z]+ · ', '')
        startMs = $startMs
        durMs   = $endMs - $startMs
    }
}

$partRows = @()
$cursor = 0
foreach ($part in $parts) {
    $partRows += [pscustomobject]@{
        role  = $part.role
        label = $part.label
        start = & $fmt $cursor
        dur   = & $fmt $part.durationMs
    }
    $cursor += $part.durationMs
}

$md = New-Object System.Collections.Generic.List[string]
$md.Add('# Center Management System — full tour chapters')
$md.Add('')
$md.Add('Generated from `ffprobe` on the merged file, not from the planned timeline.')
$md.Add('')
$md.Add("- File: ``e2e/artifacts/$OutputName``")
$md.Add(("- Duration: ``{0}`` (real)" -f (& $fmt $totalOutMs)))
$md.Add(("- Video: ``{0} {1}x{2} {3} {4} fps``, no audio" -f $video.codec_name, $video.width, $video.height, $video.pix_fmt, $video.r_frame_rate))
$md.Add(("- Chapters: ``{0}``" -f $probe.chapters.Count))
$md.Add('')
$md.Add('## Parts')
$md.Add('')
$md.Add('| # | Role | Start | Duration |')
$md.Add('|---|------|-------|----------|')
$n = 0
foreach ($row in $partRows) {
    $n++
    $md.Add(("| {0} | {1} ({2}) | {3} | {4} |" -f $n, $row.role, $row.label, $row.start, $row.dur))
}
$md.Add('')
$md.Add('## Chapters')
$md.Add('')
$md.Add('| # | Start | Duration | Chapter | Role |')
$md.Add('|---|-------|----------|---------|------|')
foreach ($row in $rows) {
    $md.Add(("| {0} | {1} | {2} | {3} | {4} |" -f $row.index, (& $fmt $row.startMs), (& $fmt $row.durMs), $row.label, $row.role))
}
$md.Add('')
[System.IO.File]::WriteAllLines($DocsPath, $md, $utf8NoBom)

Write-Host ''
Write-Host "Merged:   $outputPath"
Write-Host ("Duration: {0}" -f (& $fmt $totalOutMs))
Write-Host "Chapters: $($probe.chapters.Count)"
Write-Host "Docs:     $DocsPath"
