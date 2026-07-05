# cmake_minimum_required(VERSION 3.14)
# project(SandSketch LANGUAGES C CXX)

# set(CMAKE_CXX_STANDARD 23)
# set(CMAKE_CXX_STANDARD_REQUIRED ON)
# set(CMAKE_CXX_EXTENSIONS OFF)

# include(FetchContent)

# set(MINIFB_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
# set(MINIFB_BUILD_VERSION_INFO OFF CACHE BOOL "" FORCE)
# FetchContent_Declare(
#     minifb
#     GIT_REPOSITORY https://github.com/emoon/minifb.git
#     GIT_TAG master
#     GIT_SHALLOW TRUE
# )
# FetchContent_MakeAvailable(minifb)

# FetchContent_Declare(
#     microui
#     GIT_REPOSITORY https://github.com/rxi/microui.git
#     GIT_TAG master
#     GIT_SHALLOW TRUE
# )
# FetchContent_MakeAvailable(microui)
# add_library(microui_lib STATIC ${microui_SOURCE_DIR}/src/microui.c)

# # --- glm ---
# FetchContent_Declare(
#     glm
#     GIT_REPOSITORY https://github.com/g-truc/glm.git
#     GIT_TAG        1.0.1
#     GIT_SHALLOW    TRUE
# )
# FetchContent_MakeAvailable(glm)
# add_library(glm_lib STATIC ${glm_SOURCE_DIR}/glm/glm.cpp)


# target_include_directories(microui_lib PUBLIC ${microui_SOURCE_DIR}/src)
# target_include_directories(glm_lib PUBLIC ${glm_SOURCE_DIR})
# target_link_libraries(SandSketch PRIVATE glm_lib)
# add_executable(SandSketch
#     src/main.cpp
#     src/Renderer.cpp
#     src/Renderer.h
#     # src/ui_bridge.cpp
#     src/ui_bridge.h
#     src/SandCanvas.cpp
#     src/SandCanvas.h
#     src/SandSimulation.cpp
#     src/SandSimulation.h
#     src/TerrainSettings.h
#     src/UI/PanelControls.h
#     src/UI/SandPanel.cpp
#     src/UI/SandPanel.h
# )

# target_link_libraries(SandSketch PRIVATE minifb microui_lib glm::glm)
# target_include_directories(SandSketch PRIVATE
#     src
#     ${minifb_SOURCE_DIR}/include
#     ${microui_SOURCE_DIR}/src
# )


cmake_minimum_required(VERSION 3.14)
project(SandSketch LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(FetchContent)

# --- minifb ---
set(MINIFB_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(MINIFB_BUILD_VERSION_INFO OFF CACHE BOOL "" FORCE)
FetchContent_Declare(
    minifb
    GIT_REPOSITORY https://github.com/emoon/minifb.git
    GIT_TAG        master
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(minifb)

# --- microui (header + single C file, no CMakeLists) ---
FetchContent_Declare(
    microui
    GIT_REPOSITORY https://github.com/rxi/microui.git
    GIT_TAG        master
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(microui)

add_library(microui_lib STATIC ${microui_SOURCE_DIR}/src/microui.c)
target_include_directories(microui_lib PUBLIC ${microui_SOURCE_DIR}/src)

# --- glm ---
FetchContent_Declare(
    glm
    GIT_REPOSITORY https://github.com/g-truc/glm.git
    GIT_TAG        1.0.1
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(glm)

# --- Our application ---
add_executable(SandSketch
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

# target_link_libraries(SandSketch PRIVATE microui_lib minifb glm::glm)
# target_include_directories(SandSketch PRIVATE src ${microui_SOURCE_DIR}/src ${minifb_SOURCE_DIR}/include)
# target_include_directories(SandSketch PRIVATE src src/deps/minifb/include)
target_link_libraries(SandSketch PRIVATE microui_lib minifb glm::glm)
target_include_directories(SandSketch PRIVATE
    src
    ${microui_SOURCE_DIR}/src
    ${minifb_SOURCE_DIR}/include
    ${glm_SOURCE_DIR}
)
target_compile_definitions(SandSketch PRIVATE NANORENDER_OBJECTS_DIR="${CMAKE_CURRENT_SOURCE_DIR}/Objects")
