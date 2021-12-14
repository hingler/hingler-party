#include <version>

// todo: need a workaround for this
// works perfectly if we have to fall back

precision highp float;

#include <compatibility>

VARYING vec3 texcoord;
uniform samplerCube uCubemap;
uniform float skyboxIntensity;

uniform samplerCube uCubemap_l;
uniform float skyboxIntensity_l;

OUTPUT_FRAGCOLOR;

void main() {
  fragColor = vec4(pow(TEXTURECUBE(uCubemap, texcoord).rgb * skyboxIntensity + TEXTURECUBE(uCubemap_l, texcoord).rgb * skyboxIntensity_l, vec3(1.0 / 2.2)), 1.0);
}
