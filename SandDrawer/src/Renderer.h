#pragma once

#include "MiniFB.h"
#include <cstdint>
#include <vector>

extern "C" {
#include "microui.h"
}

struct Rect {
    int x = 0;
    int y = 0;
    int w = 0;
    int h = 0;
};

class Renderer {
public:
    Renderer(int width, int height);

    void resize(int width, int height);
    void clear(uint32_t color);
    void fill_rect(Rect rect, uint32_t color);
    void draw_rect(Rect rect, uint32_t color);
    void render_ui(mu_Context* ctx);

    uint32_t* pixels();
    int width() const;
    int height() const;

private:
    void draw_mu_rect(mu_Rect rect, mu_Color color);
    void draw_text(const char* text, mu_Vec2 pos, mu_Color color);
    void draw_icon(int id, mu_Rect rect, mu_Color color);
    void set_clip_rect(mu_Rect rect);
    void draw_pixel(int x, int y, uint32_t color);
    void draw_line(int x0, int y0, int x1, int y1, uint32_t color);
    uint32_t to_uint32(mu_Color color) const;

    int m_width = 0;
    int m_height = 0;
    std::vector<uint32_t> m_buffer;
    mu_Rect m_clip_rect = {};
};
