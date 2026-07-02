#include "UI/SandPanel.h"

namespace {
constexpr int kPanelWidth = 240;
constexpr int kPanelPadding = 12;

void draw_slider_row(mu_Context* ctx, const char* label, mu_Real* value, mu_Real low, mu_Real high)
{
    mu_label(ctx, label);
    mu_slider(ctx, value, low, high);
}
}

void SandPanel::draw(mu_Context* ctx, SandPanelState& state)
{
    state.clear_requested = false;

    const mu_Rect panel_rect = mu_rect(kPanelPadding, kPanelPadding, kPanelWidth, 176);
    if (mu_begin_window(ctx, "Sand Drawer", panel_rect)) {
        mu_layout_row(ctx, 1, nullptr, 0);
        if (mu_button(ctx, "Clear")) {
            state.clear_requested = true;
        }

        draw_slider_row(ctx, "Brush Size", &state.brush_size, 1, 64);
        draw_slider_row(ctx, "Brush Strength", &state.brush_strength, 1, 100);

        mu_checkbox(ctx, "Pause", &state.paused);
        mu_end_window(ctx);
    }
}
