#include "SandCanvas.h"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>

namespace {
constexpr uint32_t kCanvasBorderColor = MFB_RGB(170, 145, 96);
constexpr float kSandExtent = 8.0f;

struct Color {
    float r = 0.0f;
    float g = 0.0f;
    float b = 0.0f;
};

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

std::array<float, 2> rotate(float x, float z, float radians)
{
    const float c = std::cos(radians);
    const float s = std::sin(radians);
    return {x * c - z * s, x * s + z * c};
}

float sandHeight(float x, float z, const TerrainSettings& settings)
{
    const float amplitude = std::max(0.001f, settings.amplitude);
    const auto dune_space = rotate(x, z, -0.28f);
    const auto ripple_space = rotate(x, z, 0.72f);
    const auto cross_ripple_space = rotate(x, z, -0.95f);

    const float broad_dunes = (fbm(dune_space[0] + 12.0f, dune_space[1] - 7.0f, settings) - 0.5f) * amplitude;
    const float dune_ridges = ridge(fbm(dune_space[0] * 0.72f - 5.0f, dune_space[1] * 0.28f + 9.0f, settings.frequency * 1.4f, 0.46f, 2.15f, 4));
    const float ripple_mod = 0.55f + fbm(ripple_space[0] + 31.0f, ripple_space[1] - 19.0f, settings.frequency * 3.0f, 0.5f, 2.0f, 3) * 0.75f;
    const float directional_ripples = std::sin(ripple_space[0] * 11.0f + ripple_space[1] * 0.75f + dune_ridges * 1.8f) * 0.035f * ripple_mod;
    const float fine_cross_ripples = std::sin(cross_ripple_space[0] * 23.0f + cross_ripple_space[1] * 1.4f) * 0.011f;
    const float granular_noise = (fbm(x + 4.0f, z - 2.0f, 8.5f, 0.38f, 2.3f, 3) - 0.5f) * 0.025f;

    return broad_dunes + (dune_ridges - 0.5f) * amplitude * 0.28f + directional_ripples + fine_cross_ripples + granular_noise;
}

void normalize(std::array<float, 3>& value)
{
    const float length = std::sqrt(value[0] * value[0] + value[1] * value[1] + value[2] * value[2]);
    if (length > 0.0f) {
        value[0] /= length;
        value[1] /= length;
        value[2] /= length;
    }
}

float dot(const std::array<float, 3>& a, const std::array<float, 3>& b)
{
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

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

bool sameSettings(const TerrainSettings& a, const TerrainSettings& b)
{
    constexpr float epsilon = 0.0001f;
    return std::abs(a.frequency - b.frequency) < epsilon &&
        std::abs(a.amplitude - b.amplitude) < epsilon &&
        std::abs(a.persistence - b.persistence) < epsilon &&
        std::abs(a.lacunarity - b.lacunarity) < epsilon &&
        a.octaves == b.octaves &&
        a.vignette == b.vignette;
}
}

void SandCanvas::resize(Rect bounds)
{
    m_bounds = bounds;
}

void SandCanvas::clear()
{
}

void SandCanvas::set_terrain_settings(TerrainSettings settings)
{
    settings.frequency = std::max(0.001f, settings.frequency);
    settings.amplitude = std::max(0.0f, settings.amplitude);
    settings.persistence = std::clamp(settings.persistence, 0.0f, 1.0f);
    settings.lacunarity = std::max(0.001f, settings.lacunarity);
    settings.octaves = std::clamp(settings.octaves, 1, 8);
    settings.vignette = settings.vignette != 0 ? 1 : 0;

    if (!sameSettings(m_terrainSettings, settings)) {
        m_terrainSettings = settings;
    }
}

void SandCanvas::draw(Renderer& renderer) const
{
    drawTerrain(renderer);
    renderer.draw_rect(m_bounds, kCanvasBorderColor);
}

Rect SandCanvas::bounds() const
{
    return m_bounds;
}

void SandCanvas::drawTerrain(Renderer& renderer) const
{
    const int start_x = std::clamp(m_bounds.x, 0, renderer.width());
    const int start_y = std::clamp(m_bounds.y, 0, renderer.height());
    const int end_x = std::clamp(m_bounds.x + m_bounds.w, 0, renderer.width());
    const int end_y = std::clamp(m_bounds.y + m_bounds.h, 0, renderer.height());
    if (start_x >= end_x || start_y >= end_y) {
        return;
    }

    constexpr std::array<float, 3> light_dir = {0.32f, 0.84f, 0.43f};
    constexpr std::array<float, 3> view_dir = {0.0f, 1.0f, 0.22f};
    constexpr Color shadow = {102.0f, 74.0f, 39.0f};
    constexpr Color low_sand = {157.0f, 111.0f, 54.0f};
    constexpr Color mid_sand = {199.0f, 154.0f, 82.0f};
    constexpr Color warm_sand = {225.0f, 183.0f, 109.0f};
    constexpr Color highlight_sand = {255.0f, 228.0f, 163.0f};

    const float inv_width = 1.0f / static_cast<float>(std::max(1, m_bounds.w - 1));
    const float inv_height = 1.0f / static_cast<float>(std::max(1, m_bounds.h - 1));
    const float sample_step = kSandExtent / static_cast<float>(std::max(m_bounds.w, m_bounds.h));
    const float amplitude = std::max(0.001f, m_terrainSettings.amplitude);

    uint32_t* pixels = renderer.pixels();
    for (int y = start_y; y < end_y; ++y) {
        const float v = static_cast<float>(y - m_bounds.y) * inv_height;
        const float world_z = (v - 0.5f) * kSandExtent;
        const size_t row = static_cast<size_t>(y) * static_cast<size_t>(renderer.width());

        for (int x = start_x; x < end_x; ++x) {
            const float u = static_cast<float>(x - m_bounds.x) * inv_width;
            const float world_x = (u - 0.5f) * kSandExtent;
            const float center = sandHeight(world_x, world_z, m_terrainSettings);
            const float left = sandHeight(world_x - sample_step, world_z, m_terrainSettings);
            const float right = sandHeight(world_x + sample_step, world_z, m_terrainSettings);
            const float down = sandHeight(world_x, world_z - sample_step, m_terrainSettings);
            const float up = sandHeight(world_x, world_z + sample_step, m_terrainSettings);

            std::array<float, 3> normal = {left - right, sample_step * 2.0f, down - up};
            normalize(normal);

            const float diffuse = std::max(0.0f, dot(normal, light_dir));
            const float back_shadow = std::clamp((right - left + up - down) * 9.0f, -0.18f, 0.18f);

            std::array<float, 3> half_dir = {
                light_dir[0] + view_dir[0],
                light_dir[1] + view_dir[1],
                light_dir[2] + view_dir[2],
            };
            normalize(half_dir);
            const float specular = std::pow(std::max(0.0f, dot(normal, half_dir)), 24.0f) * 0.18f;

            const float height_t = std::clamp(0.5f + center / (amplitude * 1.7f), 0.0f, 1.0f);
            const float palette_noise = valueNoise(world_x * 2.7f + 10.0f, world_z * 2.7f - 4.0f);
            Color sand = mix(low_sand, mid_sand, height_t);
            sand = mix(sand, warm_sand, std::clamp(diffuse * 0.55f + palette_noise * 0.18f, 0.0f, 1.0f));
            sand = mix(shadow, sand, std::clamp(0.42f + diffuse * 0.76f - back_shadow, 0.0f, 1.0f));

            const auto ripple_space = rotate(world_x, world_z, 0.72f);
            const float ripple_line = 0.5f + 0.5f * std::sin(ripple_space[0] * 42.0f + ripple_space[1] * 2.0f);
            const float ripple_highlight = std::pow(ripple_line, 9.0f) * 0.13f * diffuse;
            const float ambient = 0.34f;
            float shade = ambient + diffuse * 0.82f + specular + ripple_highlight;

            const float nx = u * 2.0f - 1.0f;
            const float ny = v * 2.0f - 1.0f;
            if (m_terrainSettings.vignette != 0) {
                const float vignette = std::clamp(1.0f - (nx * nx + ny * ny) * 0.26f, 0.72f, 1.0f);
                shade *= vignette;
            }

            const float fine_grain = (valueNoise(world_x * 48.0f, world_z * 48.0f) - 0.5f) * 13.0f;
            const float coarse_grain = (valueNoise(world_x * 18.0f + 5.0f, world_z * 18.0f - 7.0f) - 0.5f) * 7.0f;
            const Color lit = sand * shade + highlight_sand * specular;
            const float grain = fine_grain + coarse_grain + ripple_highlight * 18.0f;

            pixels[row + static_cast<size_t>(x)] = MFB_RGB(
                toByte(lit.r + grain),
                toByte(lit.g + grain * 0.82f),
                toByte(lit.b + grain * 0.55f));
        }
    }
}
