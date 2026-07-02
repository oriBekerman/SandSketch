#pragma once

#include "Renderer.h"

class SandCanvas {
public:
    void resize(Rect bounds);
    void clear();
    void draw(Renderer& renderer) const;

    Rect bounds() const;

private:
    bool initOpenGL() const;

    Rect m_bounds = {};
    mutable bool m_glTriedInit = false;
    mutable bool m_glReady = false;
};
