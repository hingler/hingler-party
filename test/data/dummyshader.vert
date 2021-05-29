#version 100

precision mediump float;

attribute vec4 position;
attribute vec3 normal;

uniform mat4 model_matrix;
uniform mat4 vp_matrix;
uniform mat3 normal_matrix;

varying vec3 normal_v;

void main() {
  normal_v = normalize(normal_matrix * normal);
  gl_Position = vp_matrix * model_matrix * position;
}