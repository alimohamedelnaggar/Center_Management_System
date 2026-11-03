# OCR every PNG in a folder with the Windows OCR engine (ar-SA) and write a
# side-by-side UTF-8 text file per image. ASCII-only source so Windows
# PowerShell 5.1 parses it without a BOM.
param(
  [Parameter(Mandatory = $true)][string]$Folder
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.FileAccessMode, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and
    $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  })[0]

function Await($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}

$language = New-Object Windows.Globalization.Language 'ar-SA'
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
if (-not $engine) { throw 'No Arabic OCR engine is available.' }

$outDir = Join-Path $Folder 'ocr'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

foreach ($file in Get-ChildItem -Path $Folder -Filter '*.png' | Sort-Object Name) {
  $storageFile = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($file.FullName)) ([Windows.Storage.StorageFile])
  $stream = Await ($storageFile.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  $textPath = Join-Path $outDir ($file.BaseName + '.txt')
  [System.IO.File]::WriteAllText($textPath, $result.Text, (New-Object System.Text.UTF8Encoding($false)))
  $stream.Dispose()
  Write-Output ("ocr {0} -> {1} chars" -f $file.Name, $result.Text.Length)
}
