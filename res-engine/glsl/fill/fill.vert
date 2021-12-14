#include <version>

#include <compatibility>

precision highp float;

ATTRIB vec4 aPosition;

void main() {
  gl_Position = aPosition;
}