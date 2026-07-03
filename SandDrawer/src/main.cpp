#include "MiniFB.h"
#include "Renderer.h"
#include "SandCanvas.h"
#include "SandSimulation.h"
#include "UI/SandPanel.h"
#include "ui_bridge.h"

#include <cstring>

extern "C" {
#include "microui.h"
}

namespace {
constexpr int kInitialWidth = 1200;
constexpr int kInitialHeight = 800;
constexpr int kCanvasMargin = 24;
constexpr int kLeftPanelWidth = 320;

Rect canvas_bounds_for(int width, int height)
{
    // return {
    //     kLeftPanelWidth,
    //     kCanvasMargin,
    //     width - kLeftPanelWidth - kCanvasMargin,
    //     height - 2 * kCanvasMargin,
    // };
    return {
    kLeftPanelWidth + kCanvasMargin,
    kCanvasMargin,
    width - kLeftPanelWidth - 2 * kCanvasMargin,
    height - 2 * kCanvasMargin,
    };
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
            renderer.resize(window_width, window_height);
            canvas.resize(canvas_bounds_for(window_width, window_height));
        }

        ui_bridge_input(&ui_context, window);
        simulation.set_paused(panel_state.paused != 0);
        simulation.step(1.0f / 60.0f);

        mu_begin(&ui_context);
        panel.draw(&ui_context, panel_state);
        mu_end(&ui_context);

        canvas.set_terrain_settings(panel_state.terrain);

        if (panel_state.clear_requested) {
            canvas.clear();
            simulation.clear();
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
