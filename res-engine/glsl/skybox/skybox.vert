#version 100

attribute vec4 aPosition;

varying vec3 vTexcoord;

uniform mat4 uViewmat;
uniform mat4 uPersmat;

void main() {
  vec4 pos = uPersmat * uViewmat * aPosition;
  v_Texcoord = aPosition.xyz;
  gl_Position = pos.xyww;
}
