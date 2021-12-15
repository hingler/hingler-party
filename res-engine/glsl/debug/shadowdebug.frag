#include <version>

precision mediump float;

#include <compatibility>

VARYING vec2 vCoord;

uniform sampler2D tex;
uniform float near;
uniform float far;

OUTPUT_FRAGCOLOR

void main() {
  float z = TEXTURE2D(tex, vCoord).r;
  float k = (2.0 * near) / (far + near - z * (far - near));
  fragColor = vec4(vec3(k), 1.0);
}