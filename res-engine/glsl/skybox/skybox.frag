#version 100

precision highp float;

varying vec3 texcoord;
uniform samplerCube uCubemap;

void main() {
  gl_FragColor = vec4(pow(textureCube(uCubemap, texcoord).rgb, vec3(1.0 / 2.2)), 1.0);
}
