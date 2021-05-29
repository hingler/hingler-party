#version 100

precision highp float;

uniform sampler2D tex;

varying vec2 tex_v;

void main() {
  gl_FragColor = texture2D(tex, tex_v);
}