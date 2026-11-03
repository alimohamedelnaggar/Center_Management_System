param(
    [Parameter(Mandatory)][string]$Slug,
    [string]$RawVideo,
    [int]$PreChapterMs = 800,
    [int]$OffsetMs = 0,
    [int]$Crf = 22,
    [string]$Preset = 'medium'
)

$ErrorActionPreference = 'Stop'

# PowerShell 5.1 decodes native stdout with the console encoding and reads
# files as ANSI by default; both would mangle the Arabic chapter titles.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Forward slash on purpose: Join-Path must produce a path that resolves on both
# Windows and Linux, and '\' is a literal filename character on Linux.
$repoRoot = (Resolve-Path (Join-Path (Join-Path $PSScriptRoot '..') '..')).Path
$e2eDir = Join-Path $repoRoot 'e2e'
$artifactRoot = Join-Path $e2eDir 'artifacts'
$artifactDir = Join-Path $artifactRoot $Slug
$manifestPath = Join-Path $artifactDir 'chapters.json'
$rawCopy = Join-Path $artifactDir 'raw.webm'
$outPath = Join-Path $artifactDir "part-$Slug.mp4"
$metaPath = Join-Path $artifactDir 'part-meta.json'
$tempDir = [System.IO.Path]::GetTempPath()
$ffmetaPath = Join-Path $tempDir "ffmeta-$Slug.txt"
$invariant = [System.Globalization.CultureInfo]::InvariantCulture

if (-not (Test-Path $manifestPath)) {
    throw "Missing chapter manifest: $manifestPath"
}

# The raw recording is wiped by the next Playwright run, so keep a copy inside
# the artifact directory as soon as the part is rendered.
if (-not $RawVideo) {
    if (Test-Path $rawCopy) {
        $RawVideo = $rawCopy
    }
    else {
        $candidate = Get-ChildItem (Join-Path $e2eDir 'test-results') -Recurse -File -Filter 'video.webm' -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
        if (-not $candidate) { throw 'No raw video supplied and no test-results video.webm found.' }
        $RawVideo = $candidate.FullName
    }
}

if (-not (Test-Path $RawVideo)) { throw "Raw video not found: $RawVideo" }

$manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$leadInMs = [int]$manifest.firstChapterLeadInMs
$seekMs = [Math]::Max(0, $leadInMs - $PreChapterMs)
$shiftMs = $leadInMs - $seekMs

$rawDurationText = (& ffprobe -v error -select_streams v:0 -show_entries format=duration -of default=nw=1:nk=1 $RawVideo)
$rawDurationSec = [double]::Parse($rawDurationText.Trim(), $invariant)
$rawDurationMs = [int][Math]::Round($rawDurationSec * 1000)

Write-Host "Raw:      $RawVideo"
Write-Host "Raw len:  $rawDurationMs ms (manifest video: $($manifest.videoTotalMs) ms)"
Write-Host "Lead-in:  $leadInMs ms, trimming $seekMs ms, keeping $shiftMs ms before chapter 1"

$chapters = @()
foreach ($chapter in $manifest.chapters) {
    $startMs = $shiftMs + [int]$chapter.startMs + $OffsetMs
    $chapters += [pscustomobject]@{
        id       = $chapter.id
        title    = $chapter.title
        subtitle = $chapter.subtitle
        startMs  = $startMs
    }
}

# ffmpeg rewrites a chapter list whose first entry starts late: the first
# chapter is clamped to 0 and the rest keep their absolute times. Anchor the
# first chapter at 0 explicitly so the file matches what ffprobe reports.
$chapters[0].startMs = 0

$outDurationMs = $rawDurationMs - $seekMs
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add(';FFMETADATA1')
$lines.Add('title=Center Management System — full tour')
for ($i = 0; $i -lt $chapters.Count; $i++) {
    $start = $chapters[$i].startMs
    $end = if ($i -lt $chapters.Count - 1) { $chapters[$i + 1].startMs } else { [Math]::Max($start + 1000, $outDurationMs) }
    if ($end -le $start) { throw "Chapter $($chapters[$i].id) is not after the previous chapter." }
    $lines.Add('[CHAPTER]')
    $lines.Add('TIMEBASE=1/1000')
    $lines.Add("START=$start")
    $lines.Add("END=$end")
    $lines.Add("title=$($chapters[$i].id) — $($chapters[$i].title)")
}

# ffmpeg's metadata parser rejects a UTF-8 BOM, so write it explicitly without one.
[System.IO.File]::WriteAllLines($ffmetaPath, $lines, (New-Object System.Text.UTF8Encoding($false)))

if (Test-Path $outPath) { Remove-Item $outPath -Force }

$ffmpegArgs = @(
    '-hide_banner', '-loglevel', 'warning',
    '-ss', ($seekMs / 1000).ToString('0.###', $invariant),
    '-i', $RawVideo,
    '-f', 'ffmetadata', '-i', $ffmetaPath,
    '-map', '0:v:0',
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,fps=25,format=yuv420p',
    '-c:v', 'libx264', '-preset', $Preset, '-crf', "$Crf",
    '-profile:v', 'high', '-level', '4.0',
    '-g', '50', '-keyint_min', '25', '-sc_threshold', '0',
    '-map_metadata', '1', '-map_chapters', '1',
    '-movflags', '+faststart',
    '-an',
    $outPath
)

& ffmpeg @ffmpegArgs
if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed with exit code $LASTEXITCODE" }
Remove-Item $ffmetaPath -Force -ErrorAction SilentlyContinue

$probeJson = & ffprobe -v error -print_format json -show_format -show_chapters -show_streams $outPath
$probe = $probeJson | ConvertFrom-Json

$videoStream = $probe.streams | Where-Object { $_.codec_type -eq 'video' } | Select-Object -First 1
$outMs = [int][Math]::Round([double]::Parse($probe.format.duration, $invariant) * 1000)

$meta = [ordered]@{
    part       = $manifest.part
    role       = $manifest.role
    roleLabel  = $manifest.roleLabel
    recordedAt = $manifest.recordedAt
    source     = $RawVideo
    output     = $outPath
    trimMs     = $seekMs
    offsetMs   = $OffsetMs
    durationMs = $outMs
    duration   = $probe.format.duration
    video      = [ordered]@{
        codec      = $videoStream.codec_name
        profile    = $videoStream.profile
        width      = $videoStream.width
        height     = $videoStream.height
        pixFmt     = $videoStream.pix_fmt
        rFrameRate = $videoStream.r_frame_rate
    }
    chapters   = @($probe.chapters | ForEach-Object {
            [ordered]@{
                id      = ($_.tags.title -split ' — ')[0]
                title   = ($_.tags.title -split ' — ', 2)[1]
                startMs = [int][Math]::Round([double]::Parse($_.start_time, $invariant) * 1000)
                endMs   = [int][Math]::Round([double]::Parse($_.end_time, $invariant) * 1000)
            }
        })
}

[System.IO.File]::WriteAllText($metaPath, ($meta | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))

if (-not (Test-Path $rawCopy) -and ($RawVideo -notlike "*$Slug*")) {
    Copy-Item $RawVideo $rawCopy -Force
}

Write-Host ''
Write-Host "Output:   $outPath"
Write-Host ("Duration: {0:hh\:mm\:ss\.ff}" -f [TimeSpan]::FromMilliseconds($outMs))
Write-Host ("Video:    {0} {1}x{2} {3} {4}fps" -f $videoStream.codec_name, $videoStream.width, $videoStream.height, $videoStream.pix_fmt, $videoStream.r_frame_rate)
Write-Host "Chapters: $($meta.chapters.Count) -> $metaPath"
foreach ($c in $meta.chapters) {
    Write-Host ("  {0}  {1}  {2}" -f ([TimeSpan]::FromMilliseconds($c.startMs).ToString('hh\:mm\:ss')), $c.id, $c.title)
}
