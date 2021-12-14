#include <version>

precision mediump float;

#include <compatibility>

ATTRIB vec4 position;
ATTRIB vec3 normal;

uniform mat4 model_matrix;
uniform mat4 vp_matrix;
uniform mat3 normal_matrix;

VARYING vec3 normal_v;

void main() {
  normal_v = normalize(normal_matrix * normal);
  gl_Position = vp_matrix * model_matrix * position;
}