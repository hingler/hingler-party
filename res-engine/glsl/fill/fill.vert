#version 100

precision highp float;

attribute vec4 aPosition;

void main() {
  gl_Position = aPosition;
}