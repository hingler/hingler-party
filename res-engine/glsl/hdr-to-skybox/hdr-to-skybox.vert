#include <version>

precision highp float;

#include <compatibility>

ATTRIB vec4 aPosition;
VARYING vec2 vCoord;

void main() {
  vCoord = -aPosition.xy;
  gl_Position = aPosition;
}