#pragma once



enum class TerrainType {
    Flat,
    NaturalFBm,
    LargeDunes,
    Rocky,
};

enum class SandType {
    Sahara,
    WhiteBeach,
    RedDesert,  
};

enum class SurfacePattern {
    None,
    WindRipples,
    WaterRipples,
    CrossRipples,
};



struct TerrainSettings {
    TerrainType env = TerrainType::NaturalFBm;
    SandType sand_type = SandType::Sahara;
    SurfacePattern surface_pattern = SurfacePattern::WindRipples;

    float frequency = 0.28f;
    float amplitude = 0.55f;
    float persistence = 0.5f;
    float lacunarity = 2.0f;
    int octaves = 5;

    float pattern_strength = 0.28f;
    float pattern_scale = 0.75f;
    float moisture = 0.0f;
    bool vignette = true;
};


