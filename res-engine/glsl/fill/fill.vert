#include <version>

#include <compatibility>

precision highp float;

ATTRIB vec4 aPosition;

uniform mat4 vpMatrix;
uniform mat4 modelMatrix;

void main() {
  gl_Position = vpMatrix * modelMatrix * aPosition;
}