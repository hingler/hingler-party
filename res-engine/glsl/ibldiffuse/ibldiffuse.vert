#version 100

precision highp float;

attribute vec4 aPosition;
varying vec2 vCoord;

void main() {
  vCoord = -aPosition.xy;
  gl_Position = aPosition;
}