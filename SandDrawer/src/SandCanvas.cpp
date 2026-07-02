#include "SandCanvas.h"

#define NOMINMAX
#include <Windows.h>
#include <gl/GL.h>

namespace {
constexpr uint32_t kCanvasColor = MFB_RGB(32, 30, 28);
constexpr uint32_t kCanvasGridColor = MFB_RGB(48, 45, 40);
constexpr uint32_t kCanvasBorderColor = MFB_RGB(170, 145, 96);
}

void SandCanvas::resize(Rect bounds)
{
    m_bounds = bounds;
}

void SandCanvas::clear()
{
}

void SandCanvas::draw(Renderer& renderer) const
{
    (void)initOpenGL();

    renderer.fill_rect(m_bounds, kCanvasColor);

    constexpr int grid_step = 24;
    for (int x = m_bounds.x + grid_step; x < m_bounds.x + m_bounds.w; x += grid_step) {
        renderer.fill_rect({x, m_bounds.y, 1, m_bounds.h}, kCanvasGridColor);
    }
    for (int y = m_bounds.y + grid_step; y < m_bounds.y + m_bounds.h; y += grid_step) {
        renderer.fill_rect({m_bounds.x, y, m_bounds.w, 1}, kCanvasGridColor);
    }

    renderer.draw_rect(m_bounds, kCanvasBorderColor);
}

Rect SandCanvas::bounds() const
{
    return m_bounds;
}

bool SandCanvas::initOpenGL() const
{
    if (m_glTriedInit) {
        return m_glReady;
    }

    m_glTriedInit = true;
    m_glReady = wglGetCurrentContext() != nullptr;
    return m_glReady;
}
