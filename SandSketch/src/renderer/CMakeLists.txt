add_library(SandSketchRenderer STATIC
    Renderer.cpp
    Renderer.h
    ui_bridge.h
)

target_link_libraries(SandSketchRenderer
    PUBLIC
        minifb
        microui_lib
)

target_include_directories(SandSketchRenderer
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}
)
