#include "UI/SandPanel.h"

void SandPanel::draw(mu_Context* ctx, SandPanelState& state)
{
    state.clear_requested = false;

    constexpr int kPanelPadding = 12;
    constexpr int kPanelWidth = 296;
    constexpr int kPanelHeight = 460;

    const mu_Rect panel_rect =
        mu_rect(kPanelPadding, kPanelPadding, kPanelWidth, kPanelHeight);

    if (mu_begin_window(ctx, "Sand Drawer", panel_rect)) {
        
        if (panel_controls::button(ctx, "Clear")) {
            state.clear_requested = true;
        }

        panel_controls::label(ctx, "Brush Settings");
        panel_controls::draw_slider(ctx, "Brush Size", &state.brush_size, 1.0f, 64.0f);
        panel_controls::draw_slider(ctx, "Brush Strength", &state.brush_strength, 1.0f, 100.0f);

        panel_controls::label(ctx, "Terrain Settings");
        panel_controls::draw_slider(ctx, "Frequency", &state.terrain.frequency, 0.05f, 1.5f);
        panel_controls::draw_slider(ctx, "Amplitude", &state.terrain.amplitude, 0.0f, 2.0f);
        panel_controls::draw_slider(ctx, "Persistence", &state.terrain.persistence, 0.0f, 1.0f);
        panel_controls::draw_slider(ctx, "Lacunarity", &state.terrain.lacunarity, 1.0f, 4.0f);
        panel_controls::draw_int_slider(ctx, "Octaves", &state.terrain.octaves, 1, 8);
        panel_controls::checkbox(ctx, "Vignette", &state.terrain.vignette);

        panel_controls::label(ctx, "Simulation");
        panel_controls::checkbox(ctx, "Pause", &state.paused);

        mu_end_window(ctx);
    }
}
