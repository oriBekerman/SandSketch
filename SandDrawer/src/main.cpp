#include "MiniFB.h"
#include "Renderer.h"
#include "SandCanvas.h"
#include "SandSimulation.h"
#include "UI/SandPanel.h"
#include "ui_bridge.h"

#include <algorithm>
#include <cstdio>
#include <cstring>

extern "C" {
#include "microui.h"
}

namespace {
constexpr int kInitialWidth = 1200;
constexpr int kInitialHeight = 800;
constexpr int kCanvasMargin = 24;

Rect canvas_bounds_for(int width, int height)
{
    const mu_Rect panel_bounds = SandPanel::bounds_for(width, height);
    const int canvas_x = panel_bounds.x + panel_bounds.w + kCanvasMargin;
    const int canvas_y = kCanvasMargin;
    const int canvas_width = std::max(1, width - canvas_x - kCanvasMargin);
    const int canvas_height = std::max(1, height - 2 * kCanvasMargin);
    return {
        canvas_x,
        canvas_y,
        canvas_width,
        canvas_height,
    };
}

bool contains(Rect rect, int x, int y)
{
    return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

void setup_microui(mu_Context& ctx)
{
    mu_init(&ctx);
    ctx.text_width = [](mu_Font font, const char* text, int length) {
        (void)font;
        const int char_count = length < 0 ? static_cast<int>(std::strlen(text)) : length;
        return char_count * 6;
    };
    ctx.text_height = [](mu_Font font) {
        (void)font;
        return 7;
    };
}
}

int main()
{
    mfb_window* window = mfb_open_ex("SandDrawer", kInitialWidth, kInitialHeight, MFB_WF_RESIZABLE);
    if (window == nullptr) {
        return 1;
    }
    Renderer renderer(kInitialWidth, kInitialHeight);
    SandCanvas canvas;
    SandSimulation simulation;
    SandPanel panel;
    SandPanelState panel_state;

    canvas.resize(canvas_bounds_for(kInitialWidth, kInitialHeight));

    mu_Context ui_context = {};
    setup_microui(ui_context);
    mfb_set_char_input_callback(ui_bridge_char_input, window);

    while (mfb_update_events(window) != MFB_STATE_EXIT) {
        const int window_width = mfb_get_window_width(window);
        const int window_height = mfb_get_window_height(window);
        if (window_width != renderer.width() || window_height != renderer.height()) {
            std::fprintf(stderr, "[SandDrawer] resize %dx%d -> %dx%d\n", renderer.width(), renderer.height(), window_width, window_height);
            renderer.resize(window_width, window_height);
            canvas.resize(canvas_bounds_for(window_width, window_height));
        }

        ui_bridge_input(&ui_context, window);
        simulation.set_paused(panel_state.paused != 0);
        simulation.step(1.0f / 60.0f);

        mu_begin(&ui_context);
        panel.draw(&ui_context, panel_state, window_width, window_height);
        // Test window
        static int test_checkbox = 0;

        if (mu_begin_window(&ui_context, "Test Window", mu_rect(350, 20, 200, 100))) {

            int widths[] = { -1 };
            mu_layout_row(&ui_context, 1, widths, 0);

            mu_checkbox(&ui_context, "Test Checkbox", &test_checkbox);

            mu_end_window(&ui_context);
        }
        mu_end(&ui_context);

        canvas.set_terrain_settings(panel_state.terrain);

        if (panel_state.clear_requested) {
            std::fprintf(stderr, "[SandDrawer] clearing canvas and simulation\n");
            canvas.clear();
            simulation.clear();
        }

        const int mouse_x = mfb_get_mouse_x(window);
        const int mouse_y = mfb_get_mouse_y(window);
        const uint8_t* mouse_buttons = mfb_get_mouse_button_buffer(window);
        if (contains(canvas.bounds(), mouse_x, mouse_y)) {
            if (mouse_buttons[MFB_MOUSE_LEFT] != 0) {
                canvas.apply_brush(mouse_x, mouse_y, panel_state.brush_size, panel_state.brush_strength);
            } else if (mouse_buttons[MFB_MOUSE_RIGHT] != 0) {
                canvas.apply_brush(mouse_x, mouse_y, panel_state.brush_size, -panel_state.brush_strength);
            }
        }

        renderer.clear(MFB_RGB(20, 22, 24));
        canvas.draw(renderer);
        renderer.render_ui(&ui_context);

        const mfb_update_state state = mfb_update_ex(window, renderer.pixels(), renderer.width(), renderer.height());
        if (state < 0) {
            break;
        }
        mfb_wait_sync(window);
    }

    mfb_close(window);
    return 0;
}
