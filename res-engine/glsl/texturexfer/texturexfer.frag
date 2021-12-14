#include <version>

precision mediump float;

#include <compatibility>

VARYING vec2 vCoord;

uniform sampler2D tex;

OUTPUT_FRAGCOLOR;

void main() {
  vec3 res = TEXTURE2D(tex, vCoord).rgb;
  fragColor = vec4(res, 1.0);
}