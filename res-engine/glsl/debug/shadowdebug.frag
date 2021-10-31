#version 100

precision mediump float;

varying vec2 vCoord;

uniform sampler2D tex;
uniform float near;
uniform float far;

void main() {
  float z = texture2D(tex, vCoord).r;
  float k = (2.0 * near) / (far + near - z * (far - near));
  gl_FragColor = vec4(vec3(k), 1.0);
}