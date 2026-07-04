#pragma once


// enum class TerrainType {
//     NaturalFBm,
//     LargeDunes,
//     Flat,
//     Rocky,
// };

// enum class SurfacePattern {
//     None,
//     WindRipples,
//     WaterRipples,
//     CrossRipples,
// };


struct TerrainSettings {
    float frequency = 0.28f;
    float amplitude = 0.55f;
    float persistence = 0.5f;
    float lacunarity = 2.0f;
    int octaves = 5;
    int vignette = 1;
    int pattern = 1;
    float pattern_strength = 0.28f;
    float pattern_scale = 0.75f;
    float moisture = 0.0f;
};

// struct TerrainSettings {
//     TerrainType terrain_type = TerrainType::NaturalFBm;
//     SurfacePattern surface_pattern = SurfacePattern::WindRipples;

//     float frequency = 0.28f;
//     float amplitude = 0.55f;
//     float persistence = 0.5f;
//     float lacunarity = 2.0f;
//     int octaves = 5;

//     float pattern_strength = 0.28f;
//     float pattern_scale = 0.75f;
//     float moisture = 0.0f;
//     bool vignette = true;
// };