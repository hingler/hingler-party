#include <version>

precision highp float;

#include <compatibility>

VARYING vec4 vPosition;

OUTPUT_FRAGCOLOR

void main() {
  // todo: read alpha texture, hash type, and clip value
  fragColor = vec4(vPosition.xyz, 1.0);
}