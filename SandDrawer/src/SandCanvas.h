#pragma once

#include "Renderer.h"
#include "TerrainSettings.h"

class SandCanvas {
public:
    void resize(Rect bounds);
    void clear();
    void set_terrain_settings(TerrainSettings settings);
    void draw(Renderer& renderer) const;

    Rect bounds() const;

private:
    void drawTerrain(Renderer& renderer) const;

    Rect m_bounds = {};
    TerrainSettings m_terrainSettings = {};
};
