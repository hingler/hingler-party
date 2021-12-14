#include <version>

#include <compatibility>
#include <env>

ATTRIB vec4 aPosition;

VARYING vec2 vCoord;

void main() {
  vCoord = (aPosition.xy + vec2(1.0)) / vec2(2.0);
  gl_Position = aPosition;
}