#include <version>

precision highp float;

#include <compatibility>

uniform vec4 col;

OUTPUT_FRAGCOLOR

void main() {
  fragColor = col;
}