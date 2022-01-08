#include <version>
#include <compatibility>
#include <env>

#include <procedural/noise>

precision highp float;
precision highp int;

uniform float uScale;
uniform int uOctaves;

VARYING vec2 vCoord;

OUTPUT_FRAGCOLOR

void main() {
  fragColor = vec4(vec3(wrapFractalPerlin2d(vCoord, uScale, uOctaves)), 1.0);
}