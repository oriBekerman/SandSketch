#pragma once

#include "MiniFB.h"

extern "C" {
#include "microui.h"
}

void ui_bridge_char_input(struct mfb_window* window, unsigned int codepoint);
void ui_bridge_input(mu_Context* ctx, struct mfb_window* window);
