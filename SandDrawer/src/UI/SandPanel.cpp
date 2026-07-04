#include "SandPanel.h"

#include <algorithm>
#include <cstdio>

namespace {
constexpr int kPanelPadding = 12;
constexpr int kPanelMinWidth = 224;
constexpr int kPanelMaxWidth = 320;

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

        panel_controls::label(ctx, "Terrain Settings");
        const float previous_frequency = state.terrain.frequency;
        if (panel_controls::draw_slider(ctx, "Frequency", &state.terrain.frequency, 0.05f, 1.5f)) {
            log_float_change("Frequency", previous_frequency, state.terrain.frequency);
        }
        const float previous_amplitude = state.terrain.amplitude;
        if (panel_controls::draw_slider(ctx, "Amplitude", &state.terrain.amplitude, 0.0f, 2.0f)) {
            log_float_change("Amplitude", previous_amplitude, state.terrain.amplitude);
        }
        const float previous_persistence = state.terrain.persistence;
        if (panel_controls::draw_slider(ctx, "Persistence", &state.terrain.persistence, 0.0f, 1.0f)) {
            log_float_change("Persistence", previous_persistence, state.terrain.persistence);
        }
        const float previous_lacunarity = state.terrain.lacunarity;
        if (panel_controls::draw_slider(ctx, "Lacunarity", &state.terrain.lacunarity, 1.0f, 4.0f)) {
            log_float_change("Lacunarity", previous_lacunarity, state.terrain.lacunarity);
        }
        const int previous_octaves = state.terrain.octaves;
        if (panel_controls::draw_int_slider(ctx, "Octaves", &state.terrain.octaves, 1, 8)) {
            log_int_change("Octaves", previous_octaves, state.terrain.octaves);
        }
        const int previous_vignette = state.terrain.vignette;
        if (panel_controls::checkbox(ctx, "Vignette", &state.terrain.vignette)) {
            log_int_change("Vignette", previous_vignette, state.terrain.vignette);
        }
        const int previous_pattern = state.terrain.pattern;
        if (panel_controls::draw_int_slider(ctx, "Pattern", &state.terrain.pattern, 0, 4)) {
            log_int_change("Pattern", previous_pattern, state.terrain.pattern);
        }
        const float previous_pattern_strength = state.terrain.pattern_strength;
        if (panel_controls::draw_slider(ctx, "Pattern Strength", &state.terrain.pattern_strength, 0.0f, 1.0f)) {
            log_float_change("Pattern Strength", previous_pattern_strength, state.terrain.pattern_strength);
        }
        const float previous_pattern_scale = state.terrain.pattern_scale;
        if (panel_controls::draw_slider(ctx, "Pattern Scale", &state.terrain.pattern_scale, 0.35f, 2.2f)) {
            log_float_change("Pattern Scale", previous_pattern_scale, state.terrain.pattern_scale);
        }
        const float previous_moisture = state.terrain.moisture;
        if (panel_controls::draw_slider(ctx, "Moisture", &state.terrain.moisture, 0.0f, 1.0f)) {
            log_float_change("Moisture", previous_moisture, state.terrain.moisture);
        }

        panel_controls::label(ctx, "Simulation");
        const int previous_paused = state.paused;
        if (panel_controls::checkbox(ctx, "Pause", &state.paused)) {
            log_int_change("Pause", previous_paused, state.paused);
        }

        mu_end_window(ctx);
    }
}
