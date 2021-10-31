#version 100

precision highp float;

attribute vec4 position;
attribute mat4 model_matrix;
uniform mat4 shadow_matrix;

void main() {
  vec4 test = shadow_matrix * model_matrix * position;
  gl_Position = test;
}