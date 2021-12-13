#version 100

#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

attribute vec4 aPosition;
varying vec2 vCoord;

void main() {
  vCoord = (aPosition.xy + vec2(1.0)) / vec2(2.0);
  gl_Position = aPosition;
}
