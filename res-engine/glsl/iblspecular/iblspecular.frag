#version 100

#extension GL_EXT_shader_texture_lod : enable
precision highp float;

#include <pbr>
#include <constants>
#include <random>


#define SAMPLE_COUNT 2048

varying vec2 vCoord;

uniform vec3 center;
uniform vec3 right;
uniform vec3 up;

uniform samplerCube skybox;
uniform float roughness;

uniform float cubemapRes;

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
    float pdf = (D * NdotH / (4.0 * NdotH)) + 0.0001;
    float saTexel = 4.0 * PI / (6.0 * cubemapRes * cubemapRes);
    float saSample = 1.0 / (float(SAMPLE_COUNT) * pdf + 0.0001);
    // need texturelod here :(
    // i'll just use bias here!
    float mipLevel = (roughness == 0.0 ? 0.0 : 0.5 * log2(saSample / saTexel));

    if (NdotL > 0.0) {

      col += textureCube(skybox, L, mipLevel).rgb * NdotL;
      totalWeight += NdotL;
    }
  }

  col /= totalWeight;

  gl_FragColor = vec4(col, 1.0);
}