#include "ui_bridge.h"

#include <array>

namespace {
std::array<char, 32> pending_text = {};
int pending_text_length = 0;

void sync_key(mu_Context* ctx, const uint8_t* keys, std::array<uint8_t, MFB_KB_KEY_LAST + 1>& previous, int mfb_key, int mu_key)
{
    const uint8_t current = keys[mfb_key];
    if (current != 0 && previous[mfb_key] == 0) {
        mu_input_keydown(ctx, mu_key);
    }
    if (current == 0 && previous[mfb_key] != 0) {
        mu_input_keyup(ctx, mu_key);
    }
    previous[mfb_key] = current;
}

void sync_mouse(mu_Context* ctx, const uint8_t* buttons, std::array<uint8_t, 8>& previous, int x, int y, int mfb_button, int mu_button)
{
    const uint8_t current = buttons[mfb_button];
    if (current != 0 && previous[mfb_button] == 0) {
        mu_input_mousedown(ctx, x, y, mu_button);
    }
    if (current == 0 && previous[mfb_button] != 0) {
        mu_input_mouseup(ctx, x, y, mu_button);
    }
    previous[mfb_button] = current;
}
}

void ui_bridge_char_input(struct mfb_window* window, unsigned int codepoint)
{
    (void)window;
    if (codepoint < 0x80 && pending_text_length < static_cast<int>(pending_text.size()) - 1) {
        pending_text[pending_text_length++] = static_cast<char>(codepoint);
        pending_text[pending_text_length] = '\0';
    }
}

void ui_bridge_input(mu_Context* ctx, struct mfb_window* window)
{
    if (pending_text_length > 0) {
        mu_input_text(ctx, pending_text.data());
        pending_text.fill('\0');
        pending_text_length = 0;
    }

    const int mouse_x = mfb_get_mouse_x(window);
    const int mouse_y = mfb_get_mouse_y(window);
    mu_input_mousemove(ctx, mouse_x, mouse_y);

    static std::array<uint8_t, 8> previous_mouse = {};
    const uint8_t* mouse_buttons = mfb_get_mouse_button_buffer(window);
    sync_mouse(ctx, mouse_buttons, previous_mouse, mouse_x, mouse_y, MFB_MOUSE_LEFT, MU_MOUSE_LEFT);
    sync_mouse(ctx, mouse_buttons, previous_mouse, mouse_x, mouse_y, MFB_MOUSE_RIGHT, MU_MOUSE_RIGHT);
    sync_mouse(ctx, mouse_buttons, previous_mouse, mouse_x, mouse_y, MFB_MOUSE_MIDDLE, MU_MOUSE_MIDDLE);

    const float scroll_y = mfb_get_mouse_scroll_y(window);
    if (scroll_y != 0.0f) {
        mu_input_scroll(ctx, 0, static_cast<int>(scroll_y * -10.0f));
    }

    static std::array<uint8_t, MFB_KB_KEY_LAST + 1> previous_keys = {};
    const uint8_t* keys = mfb_get_key_buffer(window);
    sync_key(ctx, keys, previous_keys, MFB_KB_KEY_LEFT_SHIFT, MU_KEY_SHIFT);
    sync_key(ctx, keys, previous_keys, MFB_KB_KEY_RIGHT_SHIFT, MU_KEY_SHIFT);
    sync_key(ctx, keys, previous_keys, MFB_KB_KEY_LEFT_CONTROL, MU_KEY_CTRL);
    sync_key(ctx, keys, previous_keys, MFB_KB_KEY_RIGHT_CONTROL, MU_KEY_CTRL);
    sync_key(ctx, keys, previous_keys, MFB_KB_KEY_LEFT_ALT, MU_KEY_ALT);
    sync_key(ctx, keys, previous_keys, MFB_KB_KEY_RIGHT_ALT, MU_KEY_ALT);
    sync_key(ctx, keys, previous_keys, MFB_KB_KEY_ENTER, MU_KEY_RETURN);
    sync_key(ctx, keys, previous_keys, MFB_KB_KEY_KP_ENTER, MU_KEY_RETURN);
    sync_key(ctx, keys, previous_keys, MFB_KB_KEY_BACKSPACE, MU_KEY_BACKSPACE);
}
