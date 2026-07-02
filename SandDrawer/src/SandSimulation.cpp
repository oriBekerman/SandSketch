#include "SandSimulation.h"

void SandSimulation::set_paused(bool paused)
{
    m_paused = paused;
}

bool SandSimulation::paused() const
{
    return m_paused;
}

void SandSimulation::clear()
{
}

void SandSimulation::step(float delta_seconds)
{
    (void)delta_seconds;
    if (m_paused) {
        return;
    }
}
