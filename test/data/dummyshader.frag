#version 100

precision mediump float;

varying vec3 normal_v;

void main() {
  gl_FragColor = vec4(normal_v, 1.0);
}