#pragma once

extern "C" {
#include "microui.h"
}

struct SandPanelState {
    mu_Real brush_size = 8.0f;
    mu_Real brush_strength = 50.0f;
    int paused = 0;
    bool clear_requested = false;
};

class SandPanel {
public:
    void draw(mu_Context* ctx, SandPanelState& state);
};
