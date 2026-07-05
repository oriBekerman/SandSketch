#include "SandCanvas.h"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <glm/glm.hpp>
#include <glm/common.hpp>

namespace {
    constexpr uint32_t kCanvasBorderColor = MFB_RGB(170, 145, 96);
    constexpr float kSandExtent = 8.0f;
    constexpr float kPatternScaleMin = 0.35f;
    constexpr float kPatternScaleMax = 1.36f;
    constexpr float kDefaultCraterSpacing = 1.45f;
    constexpr int kMinCraterCount = 3;
    constexpr int kMaxCraterCount = 18;

    //====== Color Utilities ======
    struct Color {
        float r = 0.0f;
        float g = 0.0f;
        float b = 0.0f;
    };

    uint8_t toByte(float value)
    {
        return static_cast<uint8_t>(std::clamp(value, 0.0f, 255.0f));
    }

    Color mix(Color a, Color b, float t)
    {
        t = std::clamp(t, 0.0f, 1.0f);
        return {
            a.r + (b.r - a.r) * t,
            a.g + (b.g - a.g) * t,
            a.b + (b.b - a.b) * t,
        };
    }

    Color operator*(Color color, float value)
    {
        return {color.r * value, color.g * value, color.b * value};
    }

    Color operator+(Color a, Color b)
    {
        return {a.r + b.r, a.g + b.g, a.b + b.b};
    }

    Color toColor(SandColor color)
    {
        return {color.r, color.g, color.b};
    }

    //====== Noise Generation Functions ======
    float fract(float value)
    {
        return value - std::floor(value);
    }

    float hash(float x, float z)
    {
        return fract(std::sin(x * 127.1f + z * 311.7f) * 43758.5453f);
    }

    float smoothstep(float value)
    {
        return value * value * (3.0f - 2.0f * value);
    }

    float smoothstep(float edge0, float edge1, float value)
    {
        const float t = std::clamp((value - edge0) / std::max(0.0001f, edge1 - edge0), 0.0f, 1.0f);
        return smoothstep(t);
    }

    float valueNoise(float x, float z)
    {
        const float ix = std::floor(x);
        const float iz = std::floor(z);
        const float fx = smoothstep(fract(x));
        const float fz = smoothstep(fract(z));

        const float a = hash(ix, iz);
        const float b = hash(ix + 1.0f, iz);
        const float c = hash(ix, iz + 1.0f);
        const float d = hash(ix + 1.0f, iz + 1.0f);
        const float x1 = a + (b - a) * fx;
        const float x2 = c + (d - c) * fx;
        return x1 + (x2 - x1) * fz;
    }

    float fbm(float x, float z, const TerrainSettings& settings)
    {
        float total = 0.0f;
        float amplitude = 1.0f;
        float frequency = std::max(0.001f, settings.frequency);
        float normalization = 0.0f;
        const int octave_count = std::clamp(settings.octaves, 1, 8);

        for (int octave = 0; octave < octave_count; ++octave) {
            total += valueNoise(x * frequency, z * frequency) * amplitude;
            normalization += amplitude;
            frequency *= std::max(0.001f, settings.lacunarity);
            amplitude *= std::clamp(settings.persistence, 0.0f, 1.0f);
        }

        return normalization > 0.0f ? total / normalization : 0.0f;
    }

    float fbm(float x, float z, float frequency, float persistence, float lacunarity, int octaves)
    {
        TerrainSettings settings = {};
        settings.frequency = frequency;
        settings.persistence = persistence;
        settings.lacunarity = lacunarity;
        settings.octaves = octaves;
        return fbm(x, z, settings);
    }

    float ridge(float value)
    {
        return 1.0f - std::abs(value * 2.0f - 1.0f);
    }

    //====== Preset / Pattern helpers ======
    glm::vec2 rotate(float x, float z, float radians)
    {
        const float c = std::cos(radians);
        const float s = std::sin(radians);
        return {x * c - z * s, x * s + z * c};
    }

    float centeredNoise(float x, float z)
    {
        return valueNoise(x, z) - 0.5f;
    }
    float softPattern(float value, float strength, float limit)
    {
        const float limited = std::tanh(value / std::max(0.0001f, limit)) * limit;
        return std::clamp(limited * strength, -limit, limit);
    }
    glm::vec2 warped(float x, float z, float amount)
    {
        return {
            x + centeredNoise(x * 0.72f + 13.1f, z * 0.72f - 9.4f) * amount,
            z + centeredNoise(x * 0.68f - 4.7f, z * 0.68f + 21.3f) * amount,
        };
    }

    float craterProfile(float x, float z)
    {
        const float r = std::sqrt(x * x + z * z);
        const float inner_slope = 1.0f - smoothstep(0.0f, 0.82f, r);
        const float bowl = -inner_slope * inner_slope * 0.82f;
        const float rim = smoothstep(0.78f, 0.98f, r) * (1.0f - smoothstep(0.98f, 1.18f, r)) * 0.34f;
        return bowl + rim;
    }

    int craterCountForScale(float pattern_scale)
    {
        const float t = std::clamp((pattern_scale - kPatternScaleMin) / (kPatternScaleMax - kPatternScaleMin), 0.0f, 1.0f);
        return kMinCraterCount + static_cast<int>(std::round(t * static_cast<float>(kMaxCraterCount - kMinCraterCount)));
    }

    float craterPatternHeight(float x, float z, const TerrainSettings& settings)
    {
        const float radius = std::max(0.12f, settings.crater_size);
        const float depth = std::max(0.0f, settings.crater_depth);
        const float strength = std::max(0.0f, settings.pattern_strength);
        if (depth <= 0.0f || strength <= 0.0f) {
            return 0.0f;
        }

        const int crater_count = craterCountForScale(settings.pattern_scale);
        const float spacing = std::max(0.45f, settings.crater_spacing) / kDefaultCraterSpacing;
        const float min_center_distance = radius * 2.45f * spacing;
        const float center_extent = std::max(kSandExtent * 0.40f, min_center_distance * 1.35f);
        std::array<glm::vec2, kMaxCraterCount> centers = {};
        int accepted_count = 0;

        for (int candidate = 0; candidate < 256 && accepted_count < crater_count; ++candidate) {
            const float base_x =
                candidate == 0 ? -0.48f :
                candidate == 1 ? 0.34f :
                candidate == 2 ? -0.05f :
                hash(static_cast<float>(candidate) + 11.3f, 4.7f) * 2.0f - 1.0f;
            const float base_z =
                candidate == 0 ? -0.28f :
                candidate == 1 ? 0.18f :
                candidate == 2 ? 0.52f :
                hash(static_cast<float>(candidate) - 23.1f, 18.9f) * 2.0f - 1.0f;
            const glm::vec2 center = {base_x * center_extent, base_z * center_extent};
            bool has_clearance = true;
            for (int i = 0; i < accepted_count; ++i) {
                const glm::vec2 delta = center - centers[static_cast<size_t>(i)];
                if (glm::dot(delta, delta) < min_center_distance * min_center_distance) {
                    has_clearance = false;
                    break;
                }
            }
            if (has_clearance) {
                centers[static_cast<size_t>(accepted_count)] = center;
                ++accepted_count;
            }
        }

        float profile = 0.0f;

        for (int crater = 0; crater < accepted_count; ++crater) {
            const glm::vec2 center = centers[static_cast<size_t>(crater)];
            const float local_x = (x - center.x) / radius;
            const float local_z = (z - center.y) / radius;
            profile += craterProfile(local_x, local_z);
        }

        return std::tanh(profile * 0.82f) * depth * strength;
    }
    //====== Terrain generation ======

    float baseTerrainHeight(float x, float z, const TerrainSettings& settings)
    {
        const float amplitude = std::max(0.001f, settings.amplitude);
        const auto dune_space = rotate(x, z, -0.28f);
        switch (settings.preset) {
        case SandPreset::Sahara: {
            const float dune_frequency = settings.frequency * 0.15f;
            const float broad = (fbm(
                dune_space[0] + 12.0f,
                dune_space[1] - 7.0f,
                dune_frequency,
                settings.persistence,
                settings.lacunarity,
                settings.octaves) - 0.5f) * amplitude;
            const float ridges = ridge(fbm(
                dune_space[0] * 0.35f - 5.0f,
                dune_space[1] * 0.12f + 9.0f,
                dune_frequency * 0.8f,
                0.46f,
                2.15f,
                settings.octaves));
            return broad + (ridges - 0.5f) * amplitude * 0.35f;
        }
        case SandPreset::WhiteBeach: {
            const float flats = centeredNoise(x * 0.48f + 11.0f, z * 0.48f - 3.0f) * amplitude * 0.045f;
            const float soft_undulation = (fbm(dune_space[0] + 4.0f, dune_space[1] - 2.0f, 0.07f, 0.42f, 2.0f, settings.octaves) - 0.5f) * amplitude * 0.10f;
            return flats + soft_undulation;
        }
        case SandPreset::Mars: {
            const float broad = (fbm(
                dune_space[0] + 12.0f,
                dune_space[1] - 7.0f,
                settings.frequency * 0.28f,
                settings.persistence,
                settings.lacunarity,
                settings.octaves) - 0.5f) * amplitude * 0.9f;
            const float ridges = ridge(fbm(
                dune_space[0] * 0.78f - 5.0f,
                dune_space[1] * 0.26f + 9.0f,
                settings.frequency * 0.55f,
                0.52f,
                2.25f,
                settings.octaves));
            const float rough = centeredNoise(x * 1.9f + 17.0f, z * 1.9f - 6.0f) * amplitude * 0.10f;
            return broad + (ridges - 0.5f) * amplitude * 0.52f + rough;
        }
        }
        return 0.0f;
    }

    float cheapPatternHeight(float x, float z, const TerrainSettings& settings)
    {   
        const float strength = std::max(0.0f, settings.pattern_strength);
        const float scale = std::max(0.001f, settings.pattern_scale);
        const auto ws = warped(x, z, 0.42f);
        switch (settings.surface_pattern) 
        {
            case SurfacePattern::None:
                return 0.0f;
                
            case SurfacePattern::WindRipples: {
                const auto p = rotate(ws[0], ws[1], 0.72f);
                const float phase_warp = centeredNoise(x * 1.15f + 33.0f, z * 1.15f - 17.0f) * 2.4f;
                const float envelope = 0.65f + valueNoise(x * 0.48f - 8.0f, z * 0.48f + 6.0f) * 0.35f;
                const float phase = p[0] * 8.2f * scale + p[1] * 1.18f + phase_warp;
                const float primary = std::sin(phase) * 0.020f;
                const float secondary = std::sin(phase * 1.73f + phase_warp * 0.35f) * 0.005f;
                return softPattern((primary + secondary) * envelope, strength, 0.024f);
            }

            case SurfacePattern::WaterRipples: {
                const float d = std::sqrt(ws[0] * ws[0] + ws[1] * ws[1]);
                const float wave = std::sin(d * 18.0f * scale) * 0.035f;
                return softPattern(wave, strength, 0.04f);
            }

            case SurfacePattern::CrossRipples: {
                const auto p1 = rotate(ws[0], ws[1], 0.72f);
                const auto p2 = rotate(ws[0], ws[1], -0.95f);
                const float a = std::sin(p1[0] * 10.0f * scale);
                const float b = std::sin(p2[0] * 13.0f * scale);
                return softPattern((a + b) * 0.018f, strength, 0.04f);
            }

            case SurfacePattern::Craters:
                return craterPatternHeight(x, z, settings);
        }
        return 0.0f;
    }

    //======Setting comparison======
    bool sameBaseSettings(const TerrainSettings& a, const TerrainSettings& b)
    {
        constexpr float epsilon = 0.0001f;
        return a.preset == b.preset &&
            std::abs(a.frequency - b.frequency) < epsilon &&
            std::abs(a.amplitude - b.amplitude) < epsilon &&
            std::abs(a.persistence - b.persistence) < epsilon &&
            std::abs(a.lacunarity - b.lacunarity) < epsilon &&
            a.octaves == b.octaves;
    }

    bool samePatternSettings(const TerrainSettings& a, const TerrainSettings& b)
    {
        constexpr float epsilon = 0.0001f;
        return a.surface_pattern == b.surface_pattern &&
            std::abs(a.pattern_strength - b.pattern_strength) < epsilon &&
            std::abs(a.pattern_scale - b.pattern_scale) < epsilon &&
            std::abs(a.crater_spacing - b.crater_spacing) < epsilon &&
            std::abs(a.crater_size - b.crater_size) < epsilon &&
            std::abs(a.crater_depth - b.crater_depth) < epsilon;
    }

    bool sameColor(SandColor a, SandColor b)
    {
        constexpr float epsilon = 0.0001f;
        return std::abs(a.r - b.r) < epsilon &&
            std::abs(a.g - b.g) < epsilon &&
            std::abs(a.b - b.b) < epsilon;
    }

    bool sameMaterial(const SandMaterial& a, const SandMaterial& b)
    {
        constexpr float epsilon = 0.0001f;
        return sameColor(a.palette.shadow, b.palette.shadow) &&
            sameColor(a.palette.wet_shadow, b.palette.wet_shadow) &&
            sameColor(a.palette.low, b.palette.low) &&
            sameColor(a.palette.mid, b.palette.mid) &&
            sameColor(a.palette.warm, b.palette.warm) &&
            sameColor(a.palette.wet, b.palette.wet) &&
            sameColor(a.palette.highlight, b.palette.highlight) &&
            std::abs(a.fine_grain_scale - b.fine_grain_scale) < epsilon &&
            std::abs(a.coarse_grain_scale - b.coarse_grain_scale) < epsilon &&
            std::abs(a.grain_strength - b.grain_strength) < epsilon &&
            std::abs(a.shadow_strength - b.shadow_strength) < epsilon &&
            std::abs(a.diffuse_strength - b.diffuse_strength) < epsilon &&
            std::abs(a.specular_strength - b.specular_strength) < epsilon;
    }

    bool sameFinalSettings(const TerrainSettings& a, const TerrainSettings& b)
    {
        constexpr float epsilon = 0.0001f;
        return a.vignette == b.vignette &&
            std::abs(a.moisture - b.moisture) < epsilon &&
            sameMaterial(a.material, b.material);
    }

    void clampColor(SandColor& color)
    {
        color.r = std::clamp(color.r, 0.0f, 255.0f);
        color.g = std::clamp(color.g, 0.0f, 255.0f);
        color.b = std::clamp(color.b, 0.0f, 255.0f);
    }

    void clampMaterial(SandMaterial& material)
    {
        clampColor(material.palette.shadow);
        clampColor(material.palette.wet_shadow);
        clampColor(material.palette.low);
        clampColor(material.palette.mid);
        clampColor(material.palette.warm);
        clampColor(material.palette.wet);
        clampColor(material.palette.highlight);
        material.fine_grain_scale = std::max(0.001f, material.fine_grain_scale);
        material.coarse_grain_scale = std::max(0.001f, material.coarse_grain_scale);
        material.grain_strength = std::max(0.0f, material.grain_strength);
        material.shadow_strength = std::max(0.0f, material.shadow_strength);
        material.diffuse_strength = std::max(0.0f, material.diffuse_strength);
        material.specular_strength = std::max(0.0f, material.specular_strength);
    }
    
    //====== Rect helpers ======
    Rect expanded(Rect rect, int amount)
    {
        return {
            rect.x - amount,
            rect.y - amount,
            rect.w + amount * 2,
            rect.h + amount * 2,
        };
    }

    Rect clamped(Rect rect, int width, int height)
    {
        const int x1 = std::clamp(rect.x, 0, width);
        const int y1 = std::clamp(rect.y, 0, height);
        const int x2 = std::clamp(rect.x + rect.w, 0, width);
        const int y2 = std::clamp(rect.y + rect.h, 0, height);
        return {x1, y1, std::max(0, x2 - x1), std::max(0, y2 - y1)};
    }

    Rect merged(Rect a, Rect b)
    {
        if (a.w <= 0 || a.h <= 0) {
            return b;
        }
        if (b.w <= 0 || b.h <= 0) {
            return a;
        }

        const int x1 = std::min(a.x, b.x);
        const int y1 = std::min(a.y, b.y);
        const int x2 = std::max(a.x + a.w, b.x + b.w);
        const int y2 = std::max(a.y + a.h, b.y + b.h);
        return {x1, y1, x2 - x1, y2 - y1};
    }

}

//====== SandCanvas: public API =====

void SandCanvas::resize(Rect bounds)
{
    if (m_bounds.x == bounds.x &&
        m_bounds.y == bounds.y &&
        m_bounds.w == bounds.w &&
        m_bounds.h == bounds.h) {
        return;
    }

    m_bounds = bounds;
    m_cacheWidth = 0;
    m_cacheHeight = 0;
    m_baseHeight.clear();
    m_patternHeight.clear();
    m_brushHeight.clear();
    m_finalPixels.clear();
    m_baseDirty = true;
    m_patternDirty = true;
    invalidate();
}

void SandCanvas::clear()
{
    std::fill(m_brushHeight.begin(), m_brushHeight.end(), 0.0f);
    markFinalDirty({0, 0, m_cacheWidth, m_cacheHeight});
}

void SandCanvas::invalidate()
{
    markFinalDirty({0, 0, m_cacheWidth, m_cacheHeight});
}

void SandCanvas::apply_brush(int screen_x, int screen_y, float radius, float strength)
{
    ensureCaches();
    if (m_cacheWidth <= 0 || m_cacheHeight <= 0 || radius <= 0.0f || strength == 0.0f) {
        return;
    }

    const int center_x = screen_x - m_bounds.x;
    const int center_y = screen_y - m_bounds.y;
    const int brush_radius = static_cast<int>(std::ceil(radius));
    Rect edit_rect = clamped(
        {center_x - brush_radius, center_y - brush_radius, brush_radius * 2 + 1, brush_radius * 2 + 1},
        m_cacheWidth,
        m_cacheHeight);
    if (edit_rect.w <= 0 || edit_rect.h <= 0) {
        return;
    }

    const float radius_sq = radius * radius;
    const float height_delta = strength * 0.0009f;
    for (int y = edit_rect.y; y < edit_rect.y + edit_rect.h; ++y) {
        const float dy = static_cast<float>(y - center_y);
        for (int x = edit_rect.x; x < edit_rect.x + edit_rect.w; ++x) {
            const float dx = static_cast<float>(x - center_x);
            const float distance_sq = dx * dx + dy * dy;
            if (distance_sq > radius_sq) {
                continue;
            }

            const float t = 1.0f - std::sqrt(distance_sq) / radius;
            const float falloff = t * t * (3.0f - 2.0f * t);
            m_brushHeight[static_cast<size_t>(y) * static_cast<size_t>(m_cacheWidth) + static_cast<size_t>(x)] += height_delta * falloff;
        }
    }

    markFinalDirty(expanded(edit_rect, 2));
}

void SandCanvas::set_terrain_settings(TerrainSettings settings)
{
    float max_freq=std::max(2.0f, settings.frequency);
    float max_amp=std::max(5.0f, settings.amplitude);
    float max_lac=std::max(5.0f, settings.lacunarity);
    
    settings.frequency = std::max(0.001f, settings.frequency);
    settings.amplitude = std::max(0.0f, settings.amplitude);
    settings.persistence = std::clamp(settings.persistence, 0.0f, 5.0f);
    settings.lacunarity = std::max(0.001f, settings.lacunarity);
    settings.octaves = octavesFor(settings.preset);
    settings.vignette = settings.vignette != 0 ? 1 : 0;
    settings.pattern_strength = std::max(0.0f, settings.pattern_strength);
    settings.pattern_scale = std::max(0.001f, settings.pattern_scale);
    settings.crater_spacing = std::max(0.45f, settings.crater_spacing);
    settings.crater_size = std::max(0.12f, settings.crater_size);
    settings.crater_depth = std::max(0.0f, settings.crater_depth);
    settings.moisture = std::clamp(settings.moisture, 0.0f, 1.0f);
    clampMaterial(settings.material);

    const bool base_changed = !sameBaseSettings(m_terrainSettings, settings);
    const bool pattern_changed = !samePatternSettings(m_terrainSettings, settings);
    const bool final_changed = !sameFinalSettings(m_terrainSettings, settings);

    m_terrainSettings = settings;

    if (base_changed) {
        m_baseDirty = true;
    }
    if (pattern_changed) {
        m_patternDirty = true;
    }

    if (base_changed || pattern_changed || final_changed) {
        markFinalDirty({0, 0, m_cacheWidth, m_cacheHeight});
    }
}

void SandCanvas::draw(Renderer& renderer) const
{
    ensureCaches();
    rebuildDirtyFinalPixels();

    blitTerrain(renderer);
    renderer.draw_rect(m_bounds, kCanvasBorderColor);
}

Rect SandCanvas::bounds() const
{
    return m_bounds;
}

//====== SandCanvas: cache management =====

void SandCanvas::ensureCaches() const
{
    m_cacheWidth = std::max(0, m_bounds.w);
    m_cacheHeight = std::max(0, m_bounds.h);
    const size_t cache_size = static_cast<size_t>(m_cacheWidth) * static_cast<size_t>(m_cacheHeight);
    if (m_baseHeight.size() != cache_size) {
        m_baseHeight.assign(cache_size, 0.0f);
        m_patternHeight.assign(cache_size, 0.0f);
        m_brushHeight.assign(cache_size, 0.0f);
        m_finalPixels.assign(cache_size, 0);
        m_baseDirty = true;
        m_patternDirty = true;
        markFinalDirty({0, 0, m_cacheWidth, m_cacheHeight});
    }

    if (m_baseDirty) {
        rebuildBaseHeight();
    }
    if (m_patternDirty) {
        rebuildPatternHeight();
    }
}

void SandCanvas::rebuildBaseHeight() const
{
    if (m_cacheWidth <= 0 || m_cacheHeight <= 0) {
        m_baseDirty = false;
        return;
    }

    for (int y = 0; y < m_cacheHeight; ++y) {
        const float z = worldZ(y);
        const size_t row = static_cast<size_t>(y) * static_cast<size_t>(m_cacheWidth);
        for (int x = 0; x < m_cacheWidth; ++x) {
            m_baseHeight[row + static_cast<size_t>(x)] = baseTerrainHeight(worldX(x), z, m_terrainSettings);
        }
    }
    m_baseDirty = false;
    markFinalDirty({0, 0, m_cacheWidth, m_cacheHeight});
}

void SandCanvas::rebuildPatternHeight() const
{
    if (m_cacheWidth <= 0 || m_cacheHeight <= 0) {
        m_patternDirty = false;
        return;
    }

    for (int y = 0; y < m_cacheHeight; ++y) {
        const float z = worldZ(y);
        const size_t row = static_cast<size_t>(y) * static_cast<size_t>(m_cacheWidth);
        for (int x = 0; x < m_cacheWidth; ++x) {
            m_patternHeight[row + static_cast<size_t>(x)] = cheapPatternHeight(worldX(x), z, m_terrainSettings);
        }
    }
    m_patternDirty = false;
    markFinalDirty({0, 0, m_cacheWidth, m_cacheHeight});
}

void SandCanvas::rebuildDirtyFinalPixels() const
{
    if (!m_finalDirty) {
        return;
    }

    const Rect rect = clamped(m_finalDirtyRect, m_cacheWidth, m_cacheHeight);
    for (int y = rect.y; y < rect.y + rect.h; ++y) {
        const size_t row = static_cast<size_t>(y) * static_cast<size_t>(m_cacheWidth);
        for (int x = rect.x; x < rect.x + rect.w; ++x) {
            m_finalPixels[row + static_cast<size_t>(x)] = shadePixel(x, y);
        }
    }
    m_finalDirty = false;
    m_finalDirtyRect = {};
}

void SandCanvas::markFinalDirty(Rect rect) const
{
    const Rect dirty_rect = clamped(rect, m_cacheWidth, m_cacheHeight);
    if (dirty_rect.w <= 0 || dirty_rect.h <= 0) {
        return;
    }

    m_finalDirtyRect = m_finalDirty ? merged(m_finalDirtyRect, dirty_rect) : dirty_rect;
    m_finalDirty = true;
}

//===== SandCanvas: rendering =====

void SandCanvas::blitTerrain(Renderer& renderer) const
{
    const int start_x = std::clamp(m_bounds.x, 0, renderer.width());
    const int start_y = std::clamp(m_bounds.y, 0, renderer.height());
    const int end_x = std::clamp(m_bounds.x + m_bounds.w, 0, renderer.width());
    const int end_y = std::clamp(m_bounds.y + m_bounds.h, 0, renderer.height());
    if (start_x >= end_x || start_y >= end_y || m_cacheWidth <= 0 || m_cacheHeight <= 0) {
        return;
    }

    const int copy_width = std::min(end_x - start_x, m_cacheWidth - (start_x - m_bounds.x));
    if (copy_width <= 0) {
        return;
    }

    uint32_t* pixels = renderer.pixels();
    for (int y = start_y; y < end_y; ++y) {
        const int cache_y = y - m_bounds.y;
        if (cache_y < 0 || cache_y >= m_cacheHeight) {
            continue;
        }

        const int cache_x = start_x - m_bounds.x;
        std::copy_n(
            m_finalPixels.data() + static_cast<size_t>(cache_y) * static_cast<size_t>(m_cacheWidth) + static_cast<size_t>(cache_x),
            copy_width,
            pixels + static_cast<size_t>(y) * static_cast<size_t>(renderer.width()) + static_cast<size_t>(start_x));
    }
}

uint32_t SandCanvas::shadePixel(int x, int y) const
{
    const SandMaterial& material = m_terrainSettings.material;
    const SandPalette& p = material.palette;

    glm::vec3 light_dir = glm::normalize(glm::vec3(0.32f, 0.84f, 0.43f));
    glm::vec3 view_dir  = glm::normalize(glm::vec3(0.0f, 1.0f, 0.22f));

    const float sample_step =
        kSandExtent / static_cast<float>(std::max(m_cacheWidth, m_cacheHeight));

    const float center = combinedHeight(x, y);
    const float left   = combinedHeight(x - 1, y);
    const float right  = combinedHeight(x + 1, y);
    const float down   = combinedHeight(x, y - 1);
    const float up     = combinedHeight(x, y + 1);

    glm::vec3 normal = glm::normalize(glm::vec3(
        left - right,
        sample_step * 2.0f,
        down - up
    ));

    const float diffuse = glm::max(0.0f, glm::dot(normal, light_dir));
    const float back_shadow =
        std::clamp((right - left + up - down) * 9.0f * material.shadow_strength, -0.28f, 0.28f);

    glm::vec3 half_dir = glm::normalize(light_dir + view_dir);

    const float moisture = std::clamp(m_terrainSettings.moisture, 0.0f, 1.0f);

    const float specular =
        std::pow(glm::max(0.0f, glm::dot(normal, half_dir)), 24.0f) *
        (0.18f + moisture * 0.18f) * material.specular_strength;

    const float u = static_cast<float>(x) /
        static_cast<float>(std::max(1, m_cacheWidth - 1));

    const float v = static_cast<float>(y) /
        static_cast<float>(std::max(1, m_cacheHeight - 1));

    const float amplitude = std::max(0.001f, m_terrainSettings.amplitude);
    const float height_t =
        std::clamp(0.5f + center / (amplitude * 1.7f), 0.0f, 1.0f);

    const float palette_noise =
        valueNoise(worldX(x) * 2.7f + 10.0f, worldZ(y) * 2.7f - 4.0f);

    Color sand = mix(toColor(p.low), toColor(p.mid), height_t);

    sand = mix(
        sand,
        toColor(p.warm),
        std::clamp(diffuse * 0.55f * material.diffuse_strength + palette_noise * 0.18f, 0.0f, 1.0f)
    );

    sand = mix(sand, toColor(p.wet), moisture * 0.62f);

    sand = mix(
        mix(toColor(p.shadow), toColor(p.wet_shadow), moisture),
        sand,
        std::clamp(0.42f + diffuse * 0.76f * material.diffuse_strength - back_shadow, 0.0f, 1.0f)
    );

    const float pattern_center = patternHeight(x, y);

    const float pattern_slope =
        std::abs(patternHeight(x + 1, y) - patternHeight(x - 1, y)) +
        std::abs(patternHeight(x, y + 1) - patternHeight(x, y - 1));

    const float pattern_crest =
        std::clamp(pattern_center * 38.0f + pattern_slope * 14.0f, 0.0f, 1.0f);

    const float pattern_highlight =
        pattern_crest * pattern_crest * 0.055f * diffuse;

    const float ambient = 0.34f - moisture * 0.05f;

    float shade =
        ambient +
        diffuse * material.diffuse_strength * (0.82f - moisture * 0.12f) +
        specular +
        pattern_highlight;

    if (m_terrainSettings.vignette != 0) {
        const float nx = u * 2.0f - 1.0f;
        const float ny = v * 2.0f - 1.0f;
        const float vignette =
            std::clamp(1.0f - (nx * nx + ny * ny) * 0.26f, 0.72f, 1.0f);

        shade *= vignette;
    }

    const float wx = worldX(x);
    const float wz = worldZ(y);

    const float fine_grain =
        (valueNoise(wx * material.fine_grain_scale, wz * material.fine_grain_scale) - 0.5f) *
        13.0f * material.grain_strength * (1.0f - moisture * 0.45f);

    const float coarse_grain =
        (valueNoise(wx * material.coarse_grain_scale + 5.0f, wz * material.coarse_grain_scale - 7.0f) - 0.5f) *
        7.0f * material.grain_strength * (1.0f - moisture * 0.35f);

    const Color lit = sand * shade + toColor(p.highlight) * specular;
    const float grain = fine_grain + coarse_grain + pattern_highlight * 16.0f;

    return MFB_RGB(
        toByte(lit.r + grain),
        toByte(lit.g + grain * 0.82f),
        toByte(lit.b + grain * 0.55f)
    );
}

//===== SandCanvas: height sampling =====

float SandCanvas::combinedHeight(int x, int y) const
{
    const int sample_x = std::clamp(x, 0, std::max(0, m_cacheWidth - 1));
    const int sample_y = std::clamp(y, 0, std::max(0, m_cacheHeight - 1));
    const size_t index = static_cast<size_t>(sample_y) * static_cast<size_t>(m_cacheWidth) + static_cast<size_t>(sample_x);
    return m_baseHeight[index] + m_patternHeight[index] + m_brushHeight[index];
}

float SandCanvas::patternHeight(int x, int y) const
{
    const int sample_x = std::clamp(x, 0, std::max(0, m_cacheWidth - 1));
    const int sample_y = std::clamp(y, 0, std::max(0, m_cacheHeight - 1));
    return m_patternHeight[static_cast<size_t>(sample_y) * static_cast<size_t>(m_cacheWidth) + static_cast<size_t>(sample_x)];
}

//===== SandCanvas: coordinate conversion =====

float SandCanvas::worldX(int x) const
{
    const float u = static_cast<float>(x) / static_cast<float>(std::max(1, m_cacheWidth - 1));
    return (u - 0.5f) * kSandExtent;
}

float SandCanvas::worldZ(int y) const
{
    const float v = static_cast<float>(y) / static_cast<float>(std::max(1, m_cacheHeight - 1));
    return (v - 0.5f) * kSandExtent;
}
