#version 100

precision highp float;

attribute vec4 aPosition;

varying vec3 texcoord;

uniform mat4 uViewmat;
uniform mat4 uPersmat;

void main() {
  vec4 pos = uPersmat * uViewmat * aPosition;
  texcoord = aPosition.xyz;
  gl_Position = pos.xyww;
}
