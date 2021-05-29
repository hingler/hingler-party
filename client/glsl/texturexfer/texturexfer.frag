#version 100

precision mediump float;

varying vec2 vCoord;

uniform sampler2D tex;

void main() {
  vec3 res = texture2D(tex, vCoord).rgb;
  gl_FragColor = vec4(res, 1.0);
}