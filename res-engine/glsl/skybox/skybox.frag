#version 100

varying vec3 texcoord;
uniform samplerCube uCubemap;

void main() {
  gl_FragColor = textureCube(uCubemap, texcoord);
}
