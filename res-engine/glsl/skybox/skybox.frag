#version 100

// todo: need a workaround for this
// works perfectly if we have to fall back

precision highp float;

varying vec3 texcoord;
uniform samplerCube uCubemap;
uniform float skyboxIntensity;

uniform samplerCube uCubemap_l;
uniform float skyboxIntensity_l;

void main() {
  gl_FragColor = vec4(pow(textureCube(uCubemap, texcoord).rgb * skyboxIntensity + textureCube(uCubemap_l, texcoord).rgb * skyboxIntensity_l, vec3(1.0 / 2.2)), 1.0);
}
