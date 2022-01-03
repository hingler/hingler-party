cmake_minimum_required(VERSION 3.18.0)
project(hingler-party VERSION 0.0.1)

# create libs for individual components
# move our bezier curve class to WASM, pass vertices as vec3 lists

# note: our catmull rom spline does not work with js beziers, so we need to come up with a
# workaround to pass them around