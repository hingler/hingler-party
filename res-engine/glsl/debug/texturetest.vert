#include <version>

precision highp float;

#include <compatibility>

ATTRIB vec4 position;
ATTRIB vec2 texcoord;

uniform mat4 model_matrix;
uniform mat4 vp_matrix;

VARYING vec2 tex_v;

void main() {
  tex_v = texcoord;
  gl_Position = vp_matrix * model_matrix * position;
}