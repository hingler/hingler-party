#version 100

precision highp float;

attribute vec4 position;
attribute vec2 texcoord;

uniform mat4 model_matrix;
uniform mat4 vp_matrix;

varying vec2 tex_v;

void main() {
  tex_v = texcoord;
  gl_Position = vp_matrix * model_matrix * position;
}