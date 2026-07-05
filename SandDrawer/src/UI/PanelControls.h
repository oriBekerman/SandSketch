#pragma once

#include <algorithm>

extern "C" {
#include "microui.h"
}

namespace panel_controls {

inline int responsive_label_width(mu_Context* ctx)
{
    const mu_Container* container = mu_get_current_container(ctx);
    const int body_width = std::max(1, container->body.w);
    const int spacing = ctx->style != nullptr ? ctx->style->spacing : 0;
    const int desired = std::clamp(body_width * 38 / 100, 68, 112);
    const int max_label_width = std::max(1, body_width - spacing - 64);
    const int min_label_width = std::min(52, max_label_width);
    return std::clamp(desired, min_label_width, max_label_width);
}

inline void full_width_row(mu_Context* ctx,int height = 0)
{
    int widths[] = {-1};
    mu_layout_row(ctx, 1, widths, height);
}

inline void labeled_control_row(mu_Context* ctx,int height = 0)
{
    int widths[] = {responsive_label_width(ctx), -1};
    mu_layout_row(ctx, 2, widths, height);
}

inline void label(mu_Context* ctx,const char* text,int height = 0)
{
    full_width_row(ctx, height);
    mu_label(ctx, text);
}

inline bool button(mu_Context* ctx,const char* text,int height = 0)
{
    full_width_row(ctx, height);
    return mu_button(ctx, text) != 0;
}

inline bool checkbox(mu_Context* ctx,const char* text,int* value,int height = 0)
{
    full_width_row(ctx, height);
    return mu_checkbox(ctx, text, value) != 0;
}

inline bool checkbox(mu_Context* ctx,const char* text,bool* value,int height = 0)
{
    int checkbox_value = *value ? 1 : 0;
    const bool changed = checkbox(ctx, text, &checkbox_value, height);
    *value = checkbox_value != 0;
    return changed;
}

inline bool labeled_slider(mu_Context* ctx,const char* label_text,float* value,float min_value,float max_value,int height = 0)
{
    labeled_control_row(ctx, height);
    mu_label(ctx, label_text);
    return mu_slider(ctx, value, min_value, max_value) != 0;
}

// inline bool labeled_number(mu_Context* ctx,const char* label_text,float* value,float step,int height = 0)
// {
//     labeled_control_row(ctx, height);
//     mu_label(ctx, label_text);
//     return mu_number(ctx, value, step) != 0;
// }

inline bool slider_component(mu_Context* ctx,int* row,const char* label_text,float* value,float min_value,float max_value)
{
    mu_layout_row(ctx, 2, row, 24);
    mu_label(ctx, label_text);
    return mu_slider(ctx, value, min_value, max_value) != 0;
}

inline bool number_component(mu_Context* ctx,int* row,const char* label_text,float* value,float step)
{
    mu_layout_row(ctx, 2, row, 24);
    mu_label(ctx, label_text);
    return mu_number(ctx, value, step) != 0;
}

inline bool draw_slider(mu_Context* ctx,
                        const char* label_text,
                        float* value,
                        float min_value,
                        float max_value,
                        int height = 0)
{
    return labeled_slider(ctx, label_text, value, min_value, max_value, height);
}

inline bool draw_int_slider(mu_Context* ctx,
                            const char* label_text,
                            int* value,
                            int min_value,
                            int max_value,
                            int height = 0)
{
    float slider_value = static_cast<float>(*value);
    labeled_control_row(ctx, height);
    mu_label(ctx, label_text);
    const bool changed = mu_slider_ex(
        ctx,
        &slider_value,
        static_cast<float>(min_value),
        static_cast<float>(max_value),
        1.0f,
        "%.0f",
        MU_OPT_ALIGNCENTER
    ) != 0;

    if (slider_value < min_value) slider_value = static_cast<float>(min_value);
    if (slider_value > max_value) slider_value = static_cast<float>(max_value);
    *value = static_cast<int>(slider_value + 0.5f);

    return changed;
}

}


