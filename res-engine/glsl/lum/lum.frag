#version 100

// use texturexfer.vert
precision highp float;

varying vec2 vCoord;
uniform sampler2D disp;

void main() {
  // jej https://en.wikipedia.org/wiki/Relative_luminance
  vec3 col = pow(texture2D(disp, vCoord).rgb, vec3(2.2));
  float lum = col.r * 0.2126 + col.g * 0.7152 + col.b * 0.0722;
  gl_FragColor = vec4(vec3(lum), 1.0);
}