#pragma once

class SandSimulation {
public:
    void set_paused(bool paused);
    bool paused() const;
    void clear();
    void step(float delta_seconds);

private:
    bool m_paused = false;
};
