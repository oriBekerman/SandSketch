param(
    [ValidateSet("Release", "Debug", "RelWithDebInfo")]
    [string]$Configuration = "Release",

    [switch]$NoRun
)

$ErrorActionPreference = "Stop"

$projectRoot = Join-Path $PSScriptRoot "SandSketch"
$buildDir = Join-Path $PSScriptRoot "build"
$target = "SandSketch"
$executable = Join-Path (Join-Path $buildDir $Configuration) "SandSketch.exe"

if (-not (Test-Path (Join-Path $projectRoot "CMakeLists.txt"))) {
    Write-Error "Could not find SandSketch CMakeLists.txt at '$projectRoot'."
    exit 1
}

cmake -S $projectRoot -B $buildDir -DFETCHCONTENT_UPDATES_DISCONNECTED=ON
if ($LASTEXITCODE -ne 0) {
    Write-Error "CMake configuration failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

cmake --build $buildDir --target $target --config $Configuration
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

if ($NoRun) {
    exit 0
}

if (-not (Test-Path $executable)) {
    Write-Error "Build succeeded, but executable was not found at '$executable'."
    exit 1
}

& $executable
