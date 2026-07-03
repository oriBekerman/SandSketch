#pragma once


extern "C" {
#include "microui.h"
}

namespace panel_controls {

inline void full_width_row(mu_Context* ctx,int height = 0)
{
    int widths[] = {-1};
    mu_layout_row(ctx, 1, widths, height);
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

inline bool labeled_slider(mu_Context* ctx,const char* label_text,float* value,float min_value,float max_value,int height = 0)
{
    full_width_row(ctx, height);
    mu_label(ctx, label_text);
    return mu_slider(ctx, value, min_value, max_value) != 0;
}

inline bool labeled_number(mu_Context* ctx,const char* label_text,float* value,float step,int height = 0)
{
    full_width_row(ctx, height);
    mu_label(ctx, label_text);
    return mu_number(ctx, value, step) != 0;
}

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
    const bool changed = labeled_slider(
        ctx,
        label_text,
        &slider_value,
        static_cast<float>(min_value),
        static_cast<float>(max_value),
        height
    );

    if (changed) {
        if (slider_value < min_value) slider_value = static_cast<float>(min_value);
        if (slider_value > max_value) slider_value = static_cast<float>(max_value);
        *value = static_cast<int>(slider_value + 0.5f);
    }

    return changed;
}

} // namespace panel_controls
