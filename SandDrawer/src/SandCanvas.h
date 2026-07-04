#pragma once

#include "Renderer.h"
#include "TerrainSettings.h"

#include <cstdint>
#include <vector>

class SandCanvas {
public:
    void resize(Rect bounds);
    void clear();
    void invalidate();
    void apply_brush(int screen_x, int screen_y, float radius, float strength);
    void set_terrain_settings(TerrainSettings settings);
    void draw(Renderer& renderer) const;

    Rect bounds() const;

private:
    void blitTerrain(Renderer& renderer) const;
    void ensureCaches() const;
    void rebuildBaseHeight() const;
    void rebuildPatternHeight() const;
    void rebuildDirtyFinalPixels() const;
    void markFinalDirty(Rect rect) const;
    uint32_t shadePixel(int x, int y) const;
    float combinedHeight(int x, int y) const;
    float worldX(int x) const;
    float worldZ(int y) const;

    Rect m_bounds = {};
    TerrainSettings m_terrainSettings = {};
    mutable bool m_baseDirty = true;
    mutable bool m_patternDirty = true;
    mutable bool m_finalDirty = true;
    mutable Rect m_finalDirtyRect = {};
    mutable int m_cacheWidth = 0;
    mutable int m_cacheHeight = 0;
    mutable std::vector<float> m_baseHeight;
    mutable std::vector<float> m_patternHeight;
    mutable std::vector<float> m_brushHeight;
    mutable std::vector<uint32_t> m_finalPixels;
};
