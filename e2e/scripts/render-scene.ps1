param(
    [Parameter(Mandatory)][int[]]$Scene,
    [int]$Crf = 20,
    [string]$Preset = 'medium'
)

$ErrorActionPreference = 'Stop'

# Same encoding rules as render-part.ps1 / merge-tour.ps1: PowerShell 5.1
# decodes native output with the console encoding, and the captions are Arabic.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Forward slash on purpose: Join-Path must produce a path that resolves on both
# Windows and Linux, and '\' is a literal filename character on Linux.
$repoRoot = (Resolve-Path (Join-Path (Join-Path $PSScriptRoot '..') '..')).Path
$e2eDir = Join-Path $repoRoot 'e2e'
$marketingDir = Join-Path $e2eDir 'marketing'
$artifactRoot = Join-Path $e2eDir 'artifacts/marketing'
$overlayRoot = Join-Path $artifactRoot 'overlays'
$overlayScript = Join-Path $marketingDir 'render-overlays.mjs'
$timingsPath = Join-Path $artifactRoot 'scene-timings.json'
$tempDir = [System.IO.Path]::GetTempPath()
$invariant = [System.Globalization.CultureInfo]::InvariantCulture
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path $overlayScript)) { throw "Missing overlay renderer: $overlayScript" }

function Format-Seconds([double]$seconds) {
    return $seconds.ToString('0.###', $invariant)
}

# 1. Always rebuild the plan and the artwork from the recorded manifests. A
#    render can therefore never use a caption whose step no longer exists, or a
#    timing that the recorder did not produce.
$sceneList = ($Scene | ForEach-Object { [int]$_ } | Sort-Object -Unique)
$sceneArg = ($sceneList -join ',')
& node $overlayScript --scene $sceneArg
if ($LASTEXITCODE -ne 0) {
    throw "render-overlays.mjs failed with exit code $LASTEXITCODE"
}

$timings = $null
if (Test-Path $timingsPath) {
    $timings = Get-Content $timingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
}
$entries = New-Object System.Collections.Generic.List[object]
if ($timings -and $timings.scenes) {
    foreach ($existing in $timings.scenes) { $entries.Add($existing) }
}

foreach ($sceneNumber in $sceneList) {
    $slug = 'scene-{0:D2}' -f $sceneNumber
    $overlayDir = Join-Path $overlayRoot $slug
    $planPath = Join-Path $overlayDir 'plan.json'
    if (-not (Test-Path $planPath)) { throw "Missing render plan: $planPath" }

    $plan = Get-Content $planPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $outPath = Join-Path $artifactRoot "$slug.mp4"

    $totalMs = [int]$plan.totalMs
    $totalSec = $totalMs / 1000
    $bottomPx = [int]$plan.captionBottomPx
    $fadeSec = [double]$plan.captionFadeMs / 1000

    $inputs = New-Object System.Collections.Generic.List[string]
    $filter = New-Object System.Collections.Generic.List[string]
    $segments = @($plan.segments)
    $captions = @($plan.captions)

    $index = 0
    $segmentLabels = @()
    foreach ($segment in $segments) {
        $seekMs = [int]$segment.seekMs
        $durationMs = [int]$segment.durationMs
        $inputs.Add('-ss')
        $inputs.Add((Format-Seconds ($seekMs / 1000)))
        $inputs.Add('-t')
        $inputs.Add((Format-Seconds ($durationMs / 1000)))
        $inputs.Add('-i')
        $inputs.Add([string]$segment.videoAbs)

        # The recorder captures at the viewport size already; scale+pad is a
        # safety net that also guarantees an even 1920x1080 frame at 25 fps.
        $filter.Add(
            "[$index`:v]scale=1920:1080:force_original_aspect_ratio=decrease," +
            "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0B1B3F,fps=25,setsar=1," +
            "setpts=PTS-STARTPTS[s$index]"
        )
        $segmentLabels += "[s$index]"
        $index++
    }

    # Title card: 2.5 s of designed screen before the product appears.
    $titleIndex = $index
    $inputs.Add('-loop')
    $inputs.Add('1')
    $inputs.Add('-framerate')
    $inputs.Add('25')
    $inputs.Add('-t')
    $inputs.Add((Format-Seconds ([int]$plan.titleMs / 1000)))
    $inputs.Add('-i')
    $inputs.Add([string]$plan.titlePng)
    $filter.Add(
        "[$titleIndex`:v]scale=1920:1080:force_original_aspect_ratio=decrease," +
        "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0B1B3F,fps=25,setsar=1," +
        "setpts=PTS-STARTPTS[t]"
    )
    $index++

    $concatInputs = '[t]' + ($segmentLabels -join '')
    $concatCount = 1 + $segments.Count
    $filter.Add("$concatInputs concat=n=$concatCount`:v=1:a=0[base]")

    # Every caption PNG is looped for the whole scene and revealed by its own
    # enable window, so the overlay never has to wait for a late second input.
    $lastLabel = 'base'
    $captionIndex = 0
    foreach ($caption in $captions) {
        $startMs = [int]$caption.startMs
        $endMs = [int]$caption.endMs
        $start = Format-Seconds ($startMs / 1000)
        $end = Format-Seconds ($endMs / 1000)
        $fadeOut = Format-Seconds ([Math]::Max(0, $endMs - [int]$plan.captionFadeMs) / 1000)
        $fadeIn = $start

        $inputs.Add('-loop')
        $inputs.Add('1')
        $inputs.Add('-framerate')
        $inputs.Add('25')
        $inputs.Add('-t')
        $inputs.Add((Format-Seconds $totalSec))
        $inputs.Add('-i')
        $inputs.Add([string]$caption.png)

        $filter.Add(
            "[$index`:v]format=rgba," +
            "fade=t=in:st=$fadeIn`:d=$fadeSec`:alpha=1," +
            "fade=t=out:st=$fadeOut`:d=$fadeSec`:alpha=1[cap$captionIndex]"
        )
        $slide = Format-Seconds ([int]$plan.captionFadeMs / 1000)
        $y = "y='if(lt(t,$start+$slide),H-h-$bottomPx+30*(1-(t-$start)/$slide),H-h-$bottomPx)'"
        $filter.Add(
            "[$lastLabel][cap$captionIndex]overlay=" +
            "x=(W-w)/2:$y" +
            ":enable='between(t,$start,$end)'[v$captionIndex]"
        )
        $lastLabel = "v$captionIndex"
        $captionIndex++
        $index++
    }

    $filter.Add("[$lastLabel]format=yuv420p[vout]")
    # The graph is passed inline on purpose: ffmpeg 9 removed
    # -filter_complex_script, and -/filter_complex does not exist in 7.x, so a
    # single argument is the only form that works on both versions.
    $filterText = $filter -join ';'

    if (Test-Path $outPath) { Remove-Item $outPath -Force }

    $ffmpegArgs = @('-hide_banner', '-loglevel', 'warning') +
        $inputs +
        @(
            '-filter_complex', $filterText,
            '-map', '[vout]',
            '-r', '25',
            '-c:v', 'libx264', '-preset', $Preset, '-crf', "$Crf",
            '-profile:v', 'high', '-level', '4.0',
            '-g', '50', '-keyint_min', '25', '-sc_threshold', '0',
            '-movflags', '+faststart',
            '-an',
            $outPath
        )

    Write-Host ''
    Write-Host "Rendering $slug ($($plan.captions.Count) captions, $($segments.Count) segment(s))..."
    & ffmpeg @ffmpegArgs
    if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed for $slug with exit code $LASTEXITCODE" }

    $probeJson = & ffprobe -v error -print_format json -show_format -show_streams $outPath
    $probe = $probeJson | ConvertFrom-Json
    $video = $probe.streams | Where-Object { $_.codec_type -eq 'video' } | Select-Object -First 1
    if (-not $video) { throw "No video stream in $outPath" }
    $outMs = [int][Math]::Round([double]::Parse($probe.format.duration, $invariant) * 1000)
    $durationText = [TimeSpan]::FromMilliseconds($outMs).ToString('hh\:mm\:ss\.ff')

    $entry = [ordered]@{
        number          = [string]$plan.number
        scene           = $sceneNumber
        title           = [string]$plan.name
        kicker          = [string]$plan.kicker
        targetSeconds   = [int]$plan.targetSeconds
        durationSeconds = [Math]::Round($outMs / 1000, 2)
        durationMs      = $outMs
        duration        = $durationText
        output          = 'e2e/artifacts/marketing/' + "$slug.mp4"
        captions        = @($plan.captions).Count
        segments        = @($plan.segments).Count
        coverage        = [double]$plan.coverage
        video           = [ordered]@{
            codec      = $video.codec_name
            profile    = $video.profile
            width      = $video.width
            height     = $video.height
            pixFmt     = $video.pix_fmt
            rFrameRate = $video.r_frame_rate
        }
        plan            = "e2e/artifacts/marketing/overlays/$slug/plan.json"
        renderedAt      = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    }

    $entries = @($entries | Where-Object { [int]$_.scene -ne $sceneNumber })
    $entries += [pscustomobject]$entry
    $entries = @($entries | Sort-Object { [int]$_.scene })

    $document = [ordered]@{
        generatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        fps         = 25
        width       = 1920
        height      = 1080
        scenes      = $entries
    }
    [System.IO.File]::WriteAllText(
        $timingsPath,
        ($document | ConvertTo-Json -Depth 6),
        $utf8NoBom
    )

    Write-Host "Scene:    $outPath"
    Write-Host "Duration: $durationText ($outMs ms, target $($plan.targetSeconds) s)"
    Write-Host ("Video:    {0} {1}x{2} {3} {4}fps" -f $video.codec_name, $video.width, $video.height, $video.pix_fmt, $video.r_frame_rate)
    Write-Host "Timings:  $timingsPath"
}

# The total is always recomputed from the files that exist right now, never
# from the plan, so a re-render of one scene updates the whole picture.
if (Test-Path $timingsPath) {
    $final = Get-Content $timingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $sum = ($final.scenes | Measure-Object -Property durationMs -Sum).Sum
    Write-Host ''
    Write-Host ("Rendered scenes: {0}, total {1}" -f $final.scenes.Count, [TimeSpan]::FromMilliseconds($sum).ToString('hh\:mm\:ss'))
}
