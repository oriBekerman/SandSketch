# SandSketch

SandSketch is an interactive application for creating and sketching procedural sand terrain in real time.

## Features

* Procedural sand terrain
* Multiple terrain presets
* Surface patterns
* Mouse sketching
* Adjustable terrain, pattern, and brush settings

## Getting Started

### Build and Run

```powershell
.\build_and_runS.ps1
```
The script builds the project and launches the application automatically.

## Using the Application
* Select a Sand Preset to load a complete terrain configuration.
* Adjust the Terrain Settings sliders to customize the terrain.
* Choose a Surface Pattern to change the detail pattern.
* Use Pattern Strength and Pattern Scale to control the pattern appearance.
* Use the Material sliders to adjust the sand appearance.
* Adjust Brush Size and Brush Strength to control sculpting.
* Click and drag with the left mouse button to sculpt the terrain.
* Click Clear to remove all brush edits.

## Technical Overview

The project is written in C++ and consists of the following main components:

* **main.cpp** – Runs the application and handles input.
* **SandCanvas** – Generates and draws the terrain.
* **TerrainSettings** – Stores terrain presets and settings.
* **SandPanel** – Draws the control panel.
* **Renderer** – Displays the terrain and UI.

The application uses procedural noise to generate terrain and applies lighting and color to create the final sand appearance. It uses **MiniFB** for the window, **microui** for the interface, **GLM** for math, and **CMake** for building the project.
