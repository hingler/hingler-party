#include <version>

precision highp float;

#include <compatibility>

uniform sampler2D tex;

VARYING vec2 tex_v;

void main() {
  fragColor = TEXTURE2D(tex, tex_v);
}