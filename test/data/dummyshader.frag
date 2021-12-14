#include <version>

precision mediump float;

VARYING vec3 normal_v;

void main() {
  fragColor = vec4(normal_v, 1.0);
}