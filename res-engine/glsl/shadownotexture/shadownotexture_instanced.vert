#include <version>

precision highp float;

#include <compatibility>

ATTRIB vec4 position;
ATTRIB mat4 model_matrix;
uniform mat4 shadow_matrix;

void main() {
  vec4 test = shadow_matrix * model_matrix * position;
  gl_Position = test;
}