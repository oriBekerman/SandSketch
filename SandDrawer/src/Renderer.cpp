#include "Renderer.h"

#include <algorithm>
#include <array>
#include <cctype>
#include <cstdlib>

namespace {
using GlyphRows = std::array<uint8_t, 7>;

GlyphRows glyph_for(char ch)
{
    switch (static_cast<char>(std::toupper(static_cast<unsigned char>(ch)))) {
    case 'A': return {0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11};
    case 'B': return {0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e};
    case 'C': return {0x0f, 0x10, 0x10, 0x10, 0x10, 0x10, 0x0f};
    case 'D': return {0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e};
    case 'E': return {0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f};
    case 'F': return {0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10};
    case 'G': return {0x0f, 0x10, 0x10, 0x13, 0x11, 0x11, 0x0f};
    case 'H': return {0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11};
    case 'I': return {0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x1f};
    case 'J': return {0x01, 0x01, 0x01, 0x01, 0x11, 0x11, 0x0e};
    case 'K': return {0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11};
    case 'L': return {0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f};
    case 'M': return {0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11};
    case 'N': return {0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11};
    case 'O': return {0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e};
    case 'P': return {0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10};
    case 'Q': return {0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d};
    case 'R': return {0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11};
    case 'S': return {0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e};
    case 'T': return {0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04};
    case 'U': return {0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e};
    case 'V': return {0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04};
    case 'W': return {0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a};
    case 'X': return {0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11};
    case 'Y': return {0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04};
    case 'Z': return {0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f};
    case '0': return {0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e};
    case '1': return {0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e};
    case '2': return {0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f};
    case '3': return {0x1e, 0x01, 0x01, 0x0e, 0x01, 0x01, 0x1e};
    case '4': return {0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02};
    case '5': return {0x1f, 0x10, 0x10, 0x1e, 0x01, 0x01, 0x1e};
    case '6': return {0x0f, 0x10, 0x10, 0x1e, 0x11, 0x11, 0x0e};
    case '7': return {0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08};
    case '8': return {0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e};
    case '9': return {0x0e, 0x11, 0x11, 0x0f, 0x01, 0x01, 0x1e};
    case ':': return {0x00, 0x04, 0x04, 0x00, 0x04, 0x04, 0x00};
    case '.': return {0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c};
    default: return {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
    }
}

Rect to_rect(mu_Rect rect)
{
    return {rect.x, rect.y, rect.w, rect.h};
}
}

Renderer::Renderer(int width, int height)
{
    resize(width, height);
}

void Renderer::resize(int width, int height)
{
    m_width = std::max(1, width);
    m_height = std::max(1, height);
    m_buffer.resize(static_cast<size_t>(m_width) * static_cast<size_t>(m_height));
    m_clip_rect = {0, 0, m_width, m_height};
}

void Renderer::clear(uint32_t color)
{
    std::fill(m_buffer.begin(), m_buffer.end(), color);
}

void Renderer::fill_rect(Rect rect, uint32_t color)
{
    const int x1 = std::max(0, rect.x);
    const int y1 = std::max(0, rect.y);
    const int x2 = std::min(m_width, rect.x + rect.w);
    const int y2 = std::min(m_height, rect.y + rect.h);

    for (int y = y1; y < y2; ++y) {
        for (int x = x1; x < x2; ++x) {
            m_buffer[static_cast<size_t>(y) * m_width + x] = color;
        }
    }
}

void Renderer::draw_rect(Rect rect, uint32_t color)
{
    draw_line(rect.x, rect.y, rect.x + rect.w - 1, rect.y, color);
    draw_line(rect.x, rect.y, rect.x, rect.y + rect.h - 1, color);
    draw_line(rect.x + rect.w - 1, rect.y, rect.x + rect.w - 1, rect.y + rect.h - 1, color);
    draw_line(rect.x, rect.y + rect.h - 1, rect.x + rect.w - 1, rect.y + rect.h - 1, color);
}

void Renderer::render_ui(mu_Context* ctx)
{
    mu_Command* command = nullptr;
    while (mu_next_command(ctx, &command)) {
        switch (command->type) {
        case MU_COMMAND_RECT: draw_mu_rect(command->rect.rect, command->rect.color); break;
        case MU_COMMAND_TEXT: draw_text(command->text.str, command->text.pos, command->text.color); break;
        case MU_COMMAND_ICON: draw_icon(command->icon.id, command->icon.rect, command->icon.color); break;
        case MU_COMMAND_CLIP: set_clip_rect(command->clip.rect); break;
        default: break;
        }
    }
}

uint32_t* Renderer::pixels()
{
    return m_buffer.data();
}

int Renderer::width() const
{
    return m_width;
}

int Renderer::height() const
{
    return m_height;
}

void Renderer::draw_mu_rect(mu_Rect rect, mu_Color color)
{
    const uint32_t packed = to_uint32(color);
    const int x1 = std::max({rect.x, m_clip_rect.x, 0});
    const int y1 = std::max({rect.y, m_clip_rect.y, 0});
    const int x2 = std::min({rect.x + rect.w, m_clip_rect.x + m_clip_rect.w, m_width});
    const int y2 = std::min({rect.y + rect.h, m_clip_rect.y + m_clip_rect.h, m_height});

    fill_rect({x1, y1, x2 - x1, y2 - y1}, packed);
}

void Renderer::draw_text(const char* text, mu_Vec2 pos, mu_Color color)
{
    const uint32_t packed = to_uint32(color);
    int x = pos.x;

    for (const char* p = text; *p != '\0'; ++p) {
        const GlyphRows glyph = glyph_for(*p);
        for (int row = 0; row < 7; ++row) {
            for (int col = 0; col < 5; ++col) {
                if ((glyph[row] & (1 << (4 - col))) != 0) {
                    draw_pixel(x + col, pos.y + row, packed);
                }
            }
        }
        x += 6;
    }
}

void Renderer::draw_icon(int id, mu_Rect rect, mu_Color color)
{
    const uint32_t packed = to_uint32(color);
    const int cx = rect.x + rect.w / 2;
    const int cy = rect.y + rect.h / 2;
    const int half = std::min(rect.w, rect.h) / 3;

    switch (id) {
    case MU_ICON_CLOSE:
        draw_line(cx - half, cy - half, cx + half, cy + half, packed);
        draw_line(cx + half, cy - half, cx - half, cy + half, packed);
        break;
    case MU_ICON_CHECK:
        draw_line(cx - half, cy, cx - 1, cy + half, packed);
        draw_line(cx - 1, cy + half, cx + half, cy - half, packed);
        break;
    case MU_ICON_COLLAPSED:
        draw_line(cx - half, cy - half, cx + half, cy, packed);
        draw_line(cx + half, cy, cx - half, cy + half, packed);
        draw_line(cx - half, cy + half, cx - half, cy - half, packed);
        break;
    case MU_ICON_EXPANDED:
        draw_line(cx - half, cy - half, cx, cy + half, packed);
        draw_line(cx, cy + half, cx + half, cy - half, packed);
        draw_line(cx + half, cy - half, cx - half, cy - half, packed);
        break;
    default:
        fill_rect(to_rect(rect), packed);
        break;
    }
}

void Renderer::set_clip_rect(mu_Rect rect)
{
    m_clip_rect = rect;
}

void Renderer::draw_pixel(int x, int y, uint32_t color)
{
    if (x < m_clip_rect.x || x >= m_clip_rect.x + m_clip_rect.w) return;
    if (y < m_clip_rect.y || y >= m_clip_rect.y + m_clip_rect.h) return;
    if (x < 0 || x >= m_width || y < 0 || y >= m_height) return;
    m_buffer[static_cast<size_t>(y) * m_width + x] = color;
}

void Renderer::draw_line(int x0, int y0, int x1, int y1, uint32_t color)
{
    const int dx = std::abs(x1 - x0);
    const int sx = x0 < x1 ? 1 : -1;
    const int dy = -std::abs(y1 - y0);
    const int sy = y0 < y1 ? 1 : -1;
    int error = dx + dy;

    while (true) {
        draw_pixel(x0, y0, color);
        if (x0 == x1 && y0 == y1) break;
        const int e2 = 2 * error;
        if (e2 >= dy) {
            error += dy;
            x0 += sx;
        }
        if (e2 <= dx) {
            error += dx;
            y0 += sy;
        }
    }
}

uint32_t Renderer::to_uint32(mu_Color color) const
{
    return MFB_ARGB(color.a, color.r, color.g, color.b);
}
