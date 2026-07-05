#include "SandPanel.h"

#include <algorithm>
#include <cstdio>

namespace {
constexpr int kPanelPadding = 12;
constexpr int kPanelMinWidth = 224;
constexpr int kPanelMaxWidth = 320;
constexpr float kCraterMinPatternScale = 0.35f;
constexpr float kMaxFrequency = 0.30f;
constexpr float kMaxAmplitude = 0.55f;
constexpr float kMaxPersistence = 0.50f;
constexpr float kMaxLacunarity = 3.39f;
constexpr float kMaxPatternStrength = 1.31f;
constexpr float kMaxPatternScale = 1.36f;
constexpr float kMaxMoisture = 0.63f;
constexpr float kMaxCraterSpacing = 0.65f;
constexpr float kMaxCraterSize = 0.60f;
constexpr float kMaxCraterDepth = 0.22f;
constexpr float kMaxGrainStrength = 2.17f;
constexpr float kMaxShadowStrength = 1.38f;
constexpr float kMaxSpecularStrength = 1.36f;
constexpr float kMaxDiffuseStrength = 1.04f;

void sync_retained_window_rect(mu_Context* ctx, const char* title, mu_Rect rect)
{
    mu_Container* window = mu_get_container(ctx, title);
    window->rect = rect;
}

void log_float_change(const char* label, float previous, float current)
{
    if (previous != current) {
        std::fprintf(stderr, "[SandPanel] %s %.3f -> %.3f\n", label, previous, current);
    }
}

void log_int_change(const char* label, int previous, int current)
{
    if (previous != current) {
        std::fprintf(stderr, "[SandPanel] %s %d -> %d\n", label, previous, current);
    }
}

void log_bool_change(const char* label, bool previous, bool current)
{
    if (previous != current) {
        std::fprintf(stderr, "[SandPanel] %s %d -> %d\n", label, previous ? 1 : 0, current ? 1 : 0);
    }
}

const char* surface_pattern_name(SurfacePattern pattern)
{
    switch (pattern) {
    case SurfacePattern::None:
        return "None";
    case SurfacePattern::WindRipples:
        return "Wind Ripples";
    case SurfacePattern::WaterRipples:
        return "Water Ripples";
    case SurfacePattern::CrossRipples:
        return "Cross Ripples";
    case SurfacePattern::Craters:
        return "Craters";
    }
    return "Unknown";
}

const char* sand_preset_name(SandPreset preset)
{
    switch (preset) {
    case SandPreset::Sahara:
        return "Sahara";
    case SandPreset::WhiteBeach:
        return "White Sand";
    case SandPreset::Mars:
        return "Mars";
    }
    return "Unknown";
}

bool sand_preset_button(mu_Context* ctx, TerrainSettings& settings, SandPreset preset)
{
    const bool selected = settings.preset == preset;
    if (!panel_controls::selected_button(ctx, sand_preset_name(preset), selected)) {
        return false;
    }
    const SandPreset previous = settings.preset;
    applyPresetDefaults(settings, preset);
    if (previous != settings.preset) {
        std::fprintf(
            stderr,
            "[SandPanel] Sand Preset %s -> %s\n",
            sand_preset_name(previous),
            sand_preset_name(settings.preset));
    }
    return previous != settings.preset;
}

void draw_material_color_sliders(mu_Context* ctx, const char* label, SandColor& color)
{
    if (mu_begin_treenode_ex(ctx, label, 0)) {
        panel_controls::draw_slider(ctx, "R", &color.r, 0.0f, 255.0f);
        panel_controls::draw_slider(ctx, "G", &color.g, 0.0f, 255.0f);
        panel_controls::draw_slider(ctx, "B", &color.b, 0.0f, 255.0f);
        mu_end_treenode(ctx);
    }
}

bool surface_pattern_button(mu_Context* ctx, TerrainSettings& settings, SurfacePattern pattern)
{
    const bool selected = settings.surface_pattern == pattern;
    if (!panel_controls::selected_button(ctx, surface_pattern_name(pattern), selected)) {
        return false;
    }
    const SurfacePattern previous = settings.surface_pattern;
    settings.surface_pattern = pattern;
    if (previous != settings.surface_pattern) {
        std::fprintf(
            stderr,
            "[SandPanel] Surface Pattern %s -> %s\n",
            surface_pattern_name(previous),
            surface_pattern_name(settings.surface_pattern));
    }
    return previous != settings.surface_pattern;
}

}// namespace

mu_Rect SandPanel::bounds_for(int viewport_width, int viewport_height)
{
    const int safe_width = std::max(1, viewport_width);
    const int safe_height = std::max(1, viewport_height);
    const int available_width = std::max(1, safe_width - (kPanelPadding * 2));
    const int available_height = std::max(1, safe_height - (kPanelPadding * 2));

    const int responsive_width = std::clamp(safe_width / 4, kPanelMinWidth, kPanelMaxWidth);
    const int panel_width = std::min(responsive_width, available_width);
    const int panel_height = std::max(1, available_height);

    return mu_rect(kPanelPadding, kPanelPadding, panel_width, panel_height);
}

void SandPanel::draw(mu_Context* ctx, SandPanelState& state, int viewport_width, int viewport_height)
{
    state.clear_requested = false;

    const mu_Rect panel_rect = bounds_for(viewport_width, viewport_height);
    static mu_Rect previous_rect = {};
    static int previous_viewport_width = 0;
    static int previous_viewport_height = 0;
    if (panel_rect.x != previous_rect.x ||
        panel_rect.y != previous_rect.y ||
        panel_rect.w != previous_rect.w ||
        panel_rect.h != previous_rect.h ||
        viewport_width != previous_viewport_width ||
        viewport_height != previous_viewport_height) {
        std::fprintf(
            stderr,
            "[SandPanel] viewport=%dx%d panel=(%d,%d %dx%d)\n",
            viewport_width,
            viewport_height,
            panel_rect.x,
            panel_rect.y,
            panel_rect.w,
            panel_rect.h);
        previous_rect = panel_rect;
        previous_viewport_width = viewport_width;
        previous_viewport_height = viewport_height;
    }

    sync_retained_window_rect(ctx, "Sand Drawer", panel_rect);
    if (mu_begin_window_ex(ctx, "Sand Drawer", panel_rect, MU_OPT_NORESIZE | MU_OPT_NOCLOSE)) {
        
        if (panel_controls::button(ctx, "Clear")) {
            std::fprintf(stderr, "[SandPanel] Clear requested\n");
            state.clear_requested = true;
        }

        panel_controls::label(ctx, "Brush Settings");
        const float previous_brush_size = state.brush_size;
        if (panel_controls::draw_slider(ctx, "Brush Size", &state.brush_size, 1.0f, 64.0f)) {
            log_float_change("Brush Size", previous_brush_size, state.brush_size);
        }
        const float previous_brush_strength = state.brush_strength;
        if (panel_controls::draw_slider(ctx, "Brush Strength", &state.brush_strength, 1.0f, 100.0f)) {
            log_float_change("Brush Strength", previous_brush_strength, state.brush_strength);
        }

        if (mu_begin_treenode_ex(ctx, "Sand Preset", MU_OPT_EXPANDED)) {
            sand_preset_button(ctx, state.terrain, SandPreset::Sahara);
            sand_preset_button(ctx, state.terrain, SandPreset::WhiteBeach);
            sand_preset_button(ctx, state.terrain, SandPreset::Mars);
            mu_end_treenode(ctx);
        }

        panel_controls::label(ctx, "Terrain Settings");
        const float previous_frequency = state.terrain.frequency;
        if (panel_controls::draw_slider(ctx, "Frequency", &state.terrain.frequency, 0.02f, kMaxFrequency)) {
            log_float_change("Frequency", previous_frequency, state.terrain.frequency);
        }
        const float previous_amplitude = state.terrain.amplitude;
        if (panel_controls::draw_slider(ctx, "Amplitude", &state.terrain.amplitude, 0.0f, kMaxAmplitude)) {
            log_float_change("Amplitude", previous_amplitude, state.terrain.amplitude);
        }
        const float previous_persistence = state.terrain.persistence;
        if (panel_controls::draw_slider(ctx, "Persistence", &state.terrain.persistence, 0.0f, kMaxPersistence)) {
            log_float_change("Persistence", previous_persistence, state.terrain.persistence);
        }
        const float previous_lacunarity = state.terrain.lacunarity;
        if (panel_controls::draw_slider(ctx, "Lacunarity", &state.terrain.lacunarity, 1.0f, kMaxLacunarity)) {
            log_float_change("Lacunarity", previous_lacunarity, state.terrain.lacunarity);
        }
        const bool previous_vignette = state.terrain.vignette;
        if (panel_controls::checkbox(ctx, "Vignette", &state.terrain.vignette)) {
            log_bool_change("Vignette", previous_vignette, state.terrain.vignette);
        }

        if (mu_begin_treenode_ex(ctx, "Surface Pattern", MU_OPT_EXPANDED)) {
            surface_pattern_button(ctx, state.terrain, SurfacePattern::None);
            surface_pattern_button(ctx, state.terrain, SurfacePattern::WindRipples);
            surface_pattern_button(ctx, state.terrain, SurfacePattern::WaterRipples);
            surface_pattern_button(ctx, state.terrain, SurfacePattern::CrossRipples);
            surface_pattern_button(ctx, state.terrain, SurfacePattern::Craters);
            mu_end_treenode(ctx);
        }
        const float previous_pattern_strength = state.terrain.pattern_strength;
        if (panel_controls::draw_slider(ctx, "Pattern Strength", &state.terrain.pattern_strength, 0.0f, kMaxPatternStrength)) {
            log_float_change("Pattern Strength", previous_pattern_strength, state.terrain.pattern_strength);
        }
        const float previous_pattern_scale = state.terrain.pattern_scale;
        if (panel_controls::draw_slider(ctx, "Pattern Scale", &state.terrain.pattern_scale, kCraterMinPatternScale, kMaxPatternScale)) {
            log_float_change("Pattern Scale", previous_pattern_scale, state.terrain.pattern_scale);
        }
        if (state.terrain.surface_pattern == SurfacePattern::Craters) {
            const float previous_crater_spacing = state.terrain.crater_spacing;
            if (panel_controls::draw_slider(ctx, "Crater Spacing", &state.terrain.crater_spacing, 0.45f, kMaxCraterSpacing)) {
                log_float_change("Crater Spacing", previous_crater_spacing, state.terrain.crater_spacing);
            }
            const float previous_crater_size = state.terrain.crater_size;
            if (panel_controls::draw_slider(ctx, "Crater Size", &state.terrain.crater_size, 0.18f, kMaxCraterSize)) {
                log_float_change("Crater Size", previous_crater_size, state.terrain.crater_size);
            }
            const float previous_crater_depth = state.terrain.crater_depth;
            if (panel_controls::draw_slider(ctx, "Crater Depth", &state.terrain.crater_depth, 0.0f, kMaxCraterDepth)) {
                log_float_change("Crater Depth", previous_crater_depth, state.terrain.crater_depth);
            }
        }
        const float previous_moisture = state.terrain.moisture;
        if (panel_controls::draw_slider(ctx, "Moisture", &state.terrain.moisture, 0.0f, kMaxMoisture)) {
            log_float_change("Moisture", previous_moisture, state.terrain.moisture);
        }

        if (mu_begin_treenode_ex(ctx, "Material Tuning", 0)) {
            const float previous_grain_strength = state.terrain.material.grain_strength;
            if (panel_controls::draw_slider(ctx, "Grain Strength", &state.terrain.material.grain_strength, 0.0f, kMaxGrainStrength)) {
                log_float_change("Grain Strength", previous_grain_strength, state.terrain.material.grain_strength);
            }
            const float previous_shadow_strength = state.terrain.material.shadow_strength;
            if (panel_controls::draw_slider(ctx, "Shadow Strength", &state.terrain.material.shadow_strength, 0.0f, kMaxShadowStrength)) {
                log_float_change("Shadow Strength", previous_shadow_strength, state.terrain.material.shadow_strength);
            }
            const float previous_specular_strength = state.terrain.material.specular_strength;
            if (panel_controls::draw_slider(ctx, "Specular", &state.terrain.material.specular_strength, 0.0f, kMaxSpecularStrength)) {
                log_float_change("Specular", previous_specular_strength, state.terrain.material.specular_strength);
            }
            const float previous_diffuse_strength = state.terrain.material.diffuse_strength;
            if (panel_controls::draw_slider(ctx, "Diffuse Strength", &state.terrain.material.diffuse_strength, 0.0f, kMaxDiffuseStrength)) {
                log_float_change("Diffuse Strength", previous_diffuse_strength, state.terrain.material.diffuse_strength);
            }
            mu_end_treenode(ctx);
        }

        // panel_controls::label(ctx, "Simulation");
        // const int previous_paused = state.paused;
        // if (panel_controls::checkbox(ctx, "Pause", &state.paused)) {
        //     log_int_change("Pause", previous_paused, state.paused);
        // }

        mu_end_window(ctx);
    }
}
