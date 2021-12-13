#version 100

#extension GL_EXT_shader_texture_lod : enable
#extension GL_OES_standard_derivatives : enable

#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

#include <pbr>
#include <random>

precision highp float;

varying vec2 vCoord;

#define SAMPLE_COUNT 1024

vec2 integrateBRDF(float NdotV, float roughness) {
  vec3 V = vec3(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV);
  float a = 0.0;
  float b = 0.0;

  vec3 N = vec3(0.0, 0.0, 1.0);

  for (int i = 0; i < SAMPLE_COUNT; i++) {
    vec2 Xi = HammersleyNoBits(i, SAMPLE_COUNT);
    vec3 H  = importanceSampleGGX(Xi, N, roughness);

    float VdotH = max(dot(V, H), 0.0);
    vec3 L  = normalize(2.0 * VdotH * H - V);

    float NdotL = max(L.z, 0.0);
    float NdotH = max(H.z, 0.0);
    float NdotV = max(dot(N, V), 0.0);

    if (NdotL > 0.0) {
      float G = schlickSmithIBL(NdotV, NdotL, roughness);
      float GVis = (G * VdotH) / (NdotH * NdotV);
      float Fc = pow(1.0 - VdotH, 5.0);

      a += (1.0 - Fc) * GVis;
      b += Fc * GVis;
    }
  }

  a /= float(SAMPLE_COUNT);
  b /= float(SAMPLE_COUNT);
  return vec2(a, b);
}

void main() {
  vec2 res = integrateBRDF(vCoord.x, vCoord.y);
  gl_FragColor = vec4(res.xy, 0.0, 1.0);
}
