#version 100

// todo: need a workaround for this
// works perfectly if we have to fall back
#extension GL_EXT_shader_texture_lod : enable

precision highp float;

varying vec3 texcoord;
uniform samplerCube uCubemap;

void main() {
  gl_FragColor = vec4(pow(textureCubeLodEXT(uCubemap, texcoord, 0.0).rgb, vec3(1.0 / 2.2)), 1.0);
}
