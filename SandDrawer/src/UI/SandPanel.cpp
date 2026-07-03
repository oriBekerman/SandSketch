// #include "UI/SandPanel.h"


// #include <algorithm>
// #include <cmath>


// namespace {
// constexpr int kPanelWidth = 320;
// constexpr int kPanelPadding = 2;

// // void draw_slider_row(mu_Context* ctx, const char* label, mu_Real* value, mu_Real low, mu_Real high)
// // {
// //     mu_label(ctx, label);
// //     mu_slider(ctx, value, low, high);
// // }

// // void draw_int_slider_row(mu_Context* ctx, const char* label, int* value, int low, int high)
// // {
// //     mu_Real slider_value = static_cast<mu_Real>(*value);
// //     draw_slider_row(ctx, label, &slider_value, static_cast<mu_Real>(low), static_cast<mu_Real>(high));
// //     *value = std::clamp(static_cast<int>(std::round(slider_value)), low, high);
// // }
// }

// void SandPanel::draw(mu_Context* ctx, SandPanelState& state)
// {
//     state.clear_requested = false;

//     const mu_Rect panel_rect = mu_rect(kPanelPadding, kPanelPadding, kPanelWidth, 380);
//     if (mu_begin_window(ctx, "Sand Drawer", panel_rect)) {
//         mu_layout_row(ctx, 1, nullptr, 0);
//         if (mu_button(ctx, "Clear")) {
//             state.clear_requested = true;
//         }
//         mu_label(ctx, "Brush Settings");
//         draw_slider_row(ctx, "Size", &state.brush_size, 1, 64);
//         draw_slider_row(ctx, "Strength", &state.brush_strength, 1, 100);
//         mu_label(ctx, "");
//         mu_label(ctx, "Terrain Settings");
//         draw_slider_row(ctx, "Frequency", &state.terrain.frequency, 0.05f, 1.5f);
//         draw_slider_row(ctx, "Amplitude", &state.terrain.amplitude, 0.0f, 2.0f);
//         draw_slider_row(ctx, "Persistence", &state.terrain.persistence, 0.0f, 1.0f);
//         draw_slider_row(ctx, "Lacunarity", &state.terrain.lacunarity, 1.0f, 4.0f);
//         draw_int_slider_row(ctx, "Octaves", &state.terrain.octaves, 1, 8);

//         mu_checkbox(ctx, "Pause", &state.paused);
//         mu_end_window(ctx);
//     }
// }


#include "UI/SandPanel.h"
#include "UI/PanelControls.h"

void SandPanel::draw(mu_Context* ctx, SandPanelState& state)
{
    state.clear_requested = false;

    constexpr int kPanelPadding = 12;
    constexpr int kPanelWidth = 320;
    constexpr int kPanelHeight = 800;

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
