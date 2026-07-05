#pragma once



enum class SandPreset {
    Sahara,
    WhiteBeach,
    Mars,
};

enum class SurfacePattern {
    None,
    WindRipples,
    WaterRipples,
    CrossRipples,
    Craters,
};

inline int octavesFor(SandPreset preset)
{
    switch (preset) {
    case SandPreset::Sahara:
        return 3;
    case SandPreset::WhiteBeach:
        return 2;
    case SandPreset::Mars:
        return 5;
    }

    return 3;
}

struct SandColor {
    float r = 0.0f;
    float g = 0.0f;
    float b = 0.0f;
};

struct SandPalette {
    SandColor shadow;
    SandColor wet_shadow;
    SandColor low;
    SandColor mid;
    SandColor warm;
    SandColor wet;
    SandColor highlight;
};

struct SandMaterial {
    SandPalette palette;
    float fine_grain_scale = 48.0f;
    float coarse_grain_scale = 18.0f;
    float grain_strength = 1.0f;
    float shadow_strength = 1.0f;
    float diffuse_strength = 1.0f;
    float specular_strength = 1.0f;
};


inline SandMaterial materialFor(SandPreset preset)
{
    switch (preset) {
    case SandPreset::Sahara:
        return {
            {
                {92.0f, 58.0f, 24.0f},
                {64.0f, 48.0f, 36.0f},
                {154.0f, 102.0f, 38.0f},
                {205.0f, 150.0f, 70.0f},
                {234.0f, 186.0f, 104.0f},
                {124.0f, 96.0f, 68.0f},
                {255.0f, 229.0f, 154.0f},
            },
            42.0f,
            13.0f,
            1.02f,
            0.0f,
            0.98f,
            1.36f,
        };
    case SandPreset::WhiteBeach:
        return {
            {
                {125.0f, 120.0f, 110.0f},
                {95.0f, 90.0f, 85.0f},
                {205.0f, 198.0f, 182.0f},
                {222.0f, 215.0f, 200.0f},
                {236.0f, 230.0f, 214.0f},
                {180.0f, 172.0f, 160.0f},
                {245.0f, 240.0f, 228.0f},
            },
            72.0f,
            30.0f,
            2.17f,
            0.0f,
            0.79f,
            1.15f,
        };

    case SandPreset::Mars:
        return {
            {
                {70.0f, 28.0f, 18.0f},
                {52.0f, 28.0f, 24.0f},
                {132.0f, 55.0f, 30.0f},
                {182.0f, 82.0f, 38.0f},
                {230.0f, 132.0f, 68.0f},
                {114.0f, 62.0f, 42.0f},
                {255.0f, 185.0f, 112.0f},
            },
            56.0f,
            16.0f,
            1.45f,
            1.38f,
            1.04f,
            0.85f,
        };
    }

    return materialFor(SandPreset::Sahara);
}

struct TerrainSettings {
    SandPreset preset = SandPreset::Sahara;
    SurfacePattern surface_pattern = SurfacePattern::WindRipples;

    float frequency = 0.28f;
    float amplitude = 0.52f;
    float persistence = 0.24f;
    float lacunarity = 2.21f;
    int octaves = octavesFor(SandPreset::Sahara);

    float pattern_strength = 0.87f;
    float pattern_scale = 1.36f;
    float crater_spacing = 1.45f;
    float crater_size = 0.42f;
    float crater_depth = 0.34f;
    float moisture = 0.63f;
    bool vignette = false;
    SandMaterial material = materialFor(SandPreset::Sahara);
};

inline void applyPresetDefaults(TerrainSettings& settings, SandPreset preset)
{
    settings.preset = preset;
    settings.octaves = octavesFor(preset);
    settings.material = materialFor(preset);

    switch (preset) {
    case SandPreset::Sahara:
        settings.surface_pattern = SurfacePattern::WindRipples;
        settings.frequency = 0.28f;
        settings.amplitude = 0.52f;
        settings.persistence = 0.24f;
        settings.lacunarity = 2.21f;
        settings.pattern_strength = 0.87f;
        settings.pattern_scale = 1.36f;
        settings.moisture = 0.63f;
        settings.vignette = false;
        break;
    case SandPreset::WhiteBeach:
        settings.surface_pattern = SurfacePattern::CrossRipples;
        settings.frequency = 0.28f;
        settings.amplitude = 0.55f;
        settings.persistence = 0.50f;
        settings.lacunarity = 2.00f;
        settings.pattern_strength = 0.28f;
        settings.pattern_scale = 0.75f;
        settings.moisture = 0.0f;
        settings.vignette = false;
        break;
    case SandPreset::Mars:
        settings.surface_pattern = SurfacePattern::Craters;
        settings.frequency = 0.30f;
        settings.amplitude = 0.55f;
        settings.persistence = 0.50f;
        settings.lacunarity = 3.39f;
        settings.pattern_strength = 1.31f;
        settings.pattern_scale = 0.35f;
        settings.crater_depth = 0.22f;
        settings.crater_size = 0.60f;
        settings.crater_spacing = 0.65f;
        settings.moisture = 0.0f;
        settings.vignette = true;
        break;
    }
}
