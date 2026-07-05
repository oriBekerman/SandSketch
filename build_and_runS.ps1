param(
    [ValidateSet("Release", "Debug", "RelWithDebInfo")]
    [string]$Configuration = "Release",

    [switch]$NoRun
)

& "$PSScriptRoot\build_and_run.ps1" `
    -Configuration $Configuration `
    -ProjectRoot "$PSScriptRoot\SandSketch" `
    -Target "SandSketch" `
    -Executable "SandSketch.exe" `
    -NoRun:$NoRun
