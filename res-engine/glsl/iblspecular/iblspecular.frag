#version 100

#extension GL_EXT_shader_texture_lod : enable
#extension GL_OES_standard_derivates : enable

precision highp float;

#define REMOVE_SKYBOX_PBR

// todo: shader command for including something after ver decl?
// "preinclude" for includes which also require extensions
#include <pbr>
#include <constants>
#include <random>


#define SAMPLE_COUNT 4096

varying vec2 vCoord;

uniform vec3 center;
uniform vec3 right;
uniform vec3 up;

uniform samplerCube skybox;
uniform float roughness;

uniform vec2 sourceDestRes;

void main() {
  // fwd
  vec3 N = normalize(center + (right * vCoord.x) + (up * vCoord.y));
  // right
  vec3 T = normalize(cross(up, N));
  // up
  vec3 B = normalize(cross(N, T));
  mat3 norm_mat = mat3(T, B, N);

  // N, V, and R are equal

  float totalWeight = 0.0;
  vec3 col = vec3(0.0);
  for (int i = 0; i < SAMPLE_COUNT; i++) {
    vec2 Xi = HammersleyNoBits(i, SAMPLE_COUNT);
    vec3 H = importanceSampleGGX(Xi, N, roughness, norm_mat);
    float NdotH = dot(N, H);
    vec3 L = normalize(2.0 * NdotH * H - N);
    float NdotL = max(dot(N, L), 0.0);

    // HdotV = NdotH by our assumption :)
    float D = distributionGGX(NdotH, roughness);
    // pdf iirc is D * ndoth / 4.0 * hdotv but since N = V = R we can remove the dot mul
    
    float pdf = (D) + 0.0001;
    // 4.0 * PI, factor 4.0 our of PDF and out of saTexel to reduce a couple ops :)
    float saTexel = PI / (6.0 * sourceDestRes.x * sourceDestRes.x);
    float saSample = 1.0 / (float(SAMPLE_COUNT) * pdf + 0.0001);
    // need texturelod here :(
    // i'll just use bias here!
    float mipLevel = (roughness == 0.0 ? 0.0 : 0.5 * log2(saSample / saTexel));

    if (NdotL > 0.0) {
      #ifdef GL_EXT_shader_texture_lod
        col += textureCubeLodEXT(skybox, L, mipLevel).rgb * NdotL;
      #else
        // *should* work -- need to test :(
        // est default mip level for texture cube
        // mipmap lookup from OGL 4.6 spec
        // todo: factor out into function and include? (also in pbr.inc.glsl)
        vec3 Lx = dFdx(L) * sourceRes.x;
        vec3 Ly = dFdy(L) * sourceRes.x;
        float dLx = dot(Lx, Ly);
        float dLy = dot(Lx, Ly);
        float dMaxSquared = max(dLx, dLy);
        float mipGuess = 0.5 * log2(dMaxSquared);
        // lod is desired mip
        // mipguess is estimated current mipmap level
        // lod - mipguess should mimic textureCubeLod behavior
        vec3 specSample = textureCube(skybox, L, lod - mipGuess).rgb;
      #endif
      totalWeight += NdotL;
    }
  }

  col /= totalWeight;

  gl_FragColor = vec4(col, 1.0);
}