cmake_minimum_required(VERSION 3.14)
project(SandDrawer LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(FetchContent)

set(MINIFB_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(MINIFB_BUILD_VERSION_INFO OFF CACHE BOOL "" FORCE)
FetchContent_Declare(
    minifb
    GIT_REPOSITORY https://github.com/emoon/minifb.git
    GIT_TAG master
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(minifb)

FetchContent_Declare(
    microui
    GIT_REPOSITORY https://github.com/rxi/microui.git
    GIT_TAG master
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(microui)

add_library(microui_lib STATIC ${microui_SOURCE_DIR}/src/microui.c)
target_include_directories(microui_lib PUBLIC ${microui_SOURCE_DIR}/src)

add_executable(SandDrawer
    src/main.cpp
    src/Renderer.cpp
    src/Renderer.h
    # src/ui_bridge.cpp
    src/ui_bridge.h
    src/SandCanvas.cpp
    src/SandCanvas.h
    src/SandSimulation.cpp
    src/SandSimulation.h
    src/TerrainSettings.h
    src/UI/PanelControls.h
    src/UI/SandPanel.cpp
    src/UI/SandPanel.h
)

target_link_libraries(SandDrawer PRIVATE minifb microui_lib)
target_include_directories(SandDrawer PRIVATE
    src
    ${minifb_SOURCE_DIR}/include
    ${microui_SOURCE_DIR}/src
)
