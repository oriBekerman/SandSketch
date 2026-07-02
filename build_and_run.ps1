param(
    [ValidateSet("Release", "Debug", "RelWithDebInfo")]
    [string]$Configuration = "Release",

    [string]$ProjectRoot = $PSScriptRoot,

    [string]$Target = "",

    [string]$Executable = "minigui.exe",

    [switch]$NoRun
)

$vsInstallPath = & "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
$vcvars = Join-Path $vsInstallPath "VC\Auxiliary\Build\vcvarsall.bat"
$buildDir = Join-Path $ProjectRoot "build\$Configuration"
$buildCommand = "ninja -C `"$buildDir`""

if ($Target -ne "") {
    $buildCommand += " `"$Target`""
}

# 1. Configure the CMake project
# This sets up the MSVC environment and generates the Ninja build files
cmd /c "`"$vcvars`" x64 && cmake -G Ninja -DCMAKE_BUILD_TYPE=$Configuration -B `"$buildDir`" -S `"$ProjectRoot`""
if ($LASTEXITCODE -ne 0) {
    Write-Error "CMake configuration failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

# 2. Build the project
# We need to set up the MSVC environment again for the build step using Ninja
cmd /c "`"$vcvars`" x64 && $buildCommand"

if ($LASTEXITCODE -eq 0) {
    if (-not $NoRun) {
        & (Join-Path $buildDir $Executable)
    }
} else {
    Write-Error "Build failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}
