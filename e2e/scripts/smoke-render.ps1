param(
    [switch]$KeepArtifacts
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# End-to-end smoke test for the two rendering scripts. It builds a 6-second
# synthetic clip, renders it twice as two independent parts, merges them, and
# asserts the real ffprobe output. It runs on Windows PowerShell and on pwsh
# for Linux, which is why it is the workflow's pre-flight for every part.

# Forward slash on purpose: Join-Path must produce a path that resolves on both
# Windows and Linux, and '\' is a literal filename character on Linux.
$repoRoot = (Resolve-Path (Join-Path (Join-Path $PSScriptRoot '..') '..')).Path
$e2eDir = Join-Path $repoRoot 'e2e'
$artifactRoot = Join-Path $e2eDir 'artifacts'
$tempDir = [System.IO.Path]::GetTempPath()
$invariant = [System.Globalization.CultureInfo]::InvariantCulture
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$slugA = '_smoke-a'
$slugB = '_smoke-b'
$rawPath = Join-Path $tempDir 'smoke-raw.mp4'
$mergedName = '_smoke-tour.mp4'
$mergedPath = Join-Path $artifactRoot $mergedName
$docsPath = Join-Path $tempDir 'smoke-chapters.md'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw "SMOKE FAILED: $Message" }
}

function Remove-SmokeArtifacts {
    foreach ($slug in @($slugA, $slugB)) {
        $dir = Join-Path $artifactRoot $slug
        if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
    }
    if (Test-Path $mergedPath) { Remove-Item $mergedPath -Force }
    if (Test-Path $docsPath) { Remove-Item $docsPath -Force }
}

Remove-SmokeArtifacts

try {
    & ffmpeg -hide_banner -loglevel error -f lavfi -i 'testsrc2=size=640x360:rate=25:duration=6' `
        -c:v libx264 -preset ultrafast -pix_fmt yuv420p -y $rawPath
    Assert-True ($LASTEXITCODE -eq 0) 'could not build the synthetic clip'
    Assert-True (Test-Path $rawPath) 'synthetic clip was not written'

    $manifest = [ordered]@{
        part                 = 99
        role                 = 'Smoke'
        roleLabel            = 'اختبار الدخان'
        recordedAt           = (Get-Date).ToUniversalTime().ToString('o')
        videoStartEpochMs    = 0
        firstChapterLeadInMs = 1200
        totalMs              = 6000
        videoTotalMs         = 6000
        chapters             = @(
            [ordered]@{ id = 'X-01'; title = 'الأول'; subtitle = 'اختبار'; startMs = 0; durationMs = 3000; plannedMs = 1000; overrunMs = 0 },
            [ordered]@{ id = 'X-02'; title = 'الثاني'; subtitle = 'اختبار'; startMs = 3000; durationMs = 3000; plannedMs = 1000; overrunMs = 0 }
        )
    }

    foreach ($slug in @($slugA, $slugB)) {
        $dir = Join-Path $artifactRoot $slug
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        [System.IO.File]::WriteAllText(
            (Join-Path $dir 'chapters.json'),
            ($manifest | ConvertTo-Json -Depth 6),
            $utf8NoBom)
    }

    $renderScript = Join-Path $PSScriptRoot 'render-part.ps1'
    foreach ($slug in @($slugA, $slugB)) {
        & $renderScript -Slug $slug -RawVideo $rawPath -PreChapterMs 500 -Crf 36 -Preset ultrafast | Out-Host
    }

    $metas = @()
    foreach ($slug in @($slugA, $slugB)) {
        $dir = Join-Path $artifactRoot $slug
        $partPath = Join-Path $dir "part-$slug.mp4"
        Assert-True (Test-Path $partPath) "render did not produce $partPath"
        $meta = Get-Content (Join-Path $dir 'part-meta.json') -Raw -Encoding UTF8 | ConvertFrom-Json
        $metas += $meta

        Assert-True ([int]$meta.video.width -eq 1280) "part width is $($meta.video.width)"
        Assert-True ([int]$meta.video.height -eq 720) "part height is $($meta.video.height)"
        Assert-True ($meta.video.codec -eq 'h264') "part codec is $($meta.video.codec)"
        Assert-True ($meta.video.pixFmt -eq 'yuv420p') "part pix_fmt is $($meta.video.pixFmt)"
        Assert-True ($meta.video.rFrameRate -eq '25/1') "part rate is $($meta.video.rFrameRate)"
        Assert-True ([int]$meta.chapters.Count -eq 2) "part chapter count is $($meta.chapters.Count)"

        # lead-in 1200 ms, keep 500 -> 700 ms trimmed; chapter 2 at 500 + 3000.
        Assert-True ([int]$meta.trimMs -eq 700) "part trim is $($meta.trimMs)"
        Assert-True ([int]$meta.chapters[0].startMs -eq 0) 'chapter 1 is not anchored at 0'
        Assert-True ([Math]::Abs([int]$meta.chapters[1].startMs - 3500) -le 40) "chapter 2 starts at $($meta.chapters[1].startMs)"
        Assert-True ([int]$meta.durationMs -ge 5000 -and [int]$meta.durationMs -le 5700) "part duration is $($meta.durationMs)"
        Assert-True ($meta.chapters[0].title -eq 'الأول') 'Arabic chapter title was mangled'
    }

    $mergeScript = Join-Path $PSScriptRoot 'merge-tour.ps1'
    & $mergeScript -Slugs $slugA, $slugB -OutputName $mergedName -DocsPath $docsPath | Out-Host

    Assert-True (Test-Path $mergedPath) 'merge did not produce the output file'
    $probeJson = & ffprobe -v error -print_format json -show_format -show_chapters -show_streams $mergedPath
    $probe = $probeJson | ConvertFrom-Json
    $video = $probe.streams | Where-Object { $_.codec_type -eq 'video' } | Select-Object -First 1

    $mergedMs = [int][Math]::Round([double]::Parse($probe.format.duration, $invariant) * 1000)
    $expectedMs = [int]$metas[0].durationMs + [int]$metas[1].durationMs
    Assert-True ([Math]::Abs($mergedMs - $expectedMs) -le 200) "merged duration $mergedMs != $expectedMs"
    Assert-True ([int]$video.width -eq 1280 -and [int]$video.height -eq 720) 'merged frame is not 1280x720'
    Assert-True ($video.pix_fmt -eq 'yuv420p') "merged pix_fmt is $($video.pix_fmt)"
    Assert-True ([int]$probe.chapters.Count -eq 4) "merged chapter count is $($probe.chapters.Count)"

    $thirdStart = [int][Math]::Round([double]::Parse($probe.chapters[2].start_time, $invariant) * 1000)
    Assert-True ([Math]::Abs($thirdStart - [int]$metas[0].durationMs) -le 60) "chapter 3 starts at $thirdStart instead of $($metas[0].durationMs)"
    Assert-True ($probe.chapters[2].tags.title.StartsWith('Smoke · X-01')) "chapter 3 title is $($probe.chapters[2].tags.title)"

    $doc = Get-Content $docsPath -Raw -Encoding UTF8
    Assert-True ($doc -match '\| 4 \|') 'docs did not list all four chapters'
    Assert-True ($doc -match 'Smoke') 'docs did not carry the role name'

    Write-Host ("SMOKE OK — parts {0} ms each, merged {1} ms, 4 chapters, 1280x720 {2}" -f [int]$metas[0].durationMs, $mergedMs, $video.pix_fmt)
}
finally {
    if (-not $KeepArtifacts) { Remove-SmokeArtifacts }
    if (Test-Path $rawPath) { Remove-Item $rawPath -Force -ErrorAction SilentlyContinue }
}
