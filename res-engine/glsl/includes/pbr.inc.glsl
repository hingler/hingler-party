// thank you https://learnopengl.com/PBR/Theory
#include <constants.inc.glsl>
#include <env>

// SHADER_QUALITY:
// 2: high
// 1: med
// 0: low

// high: current full fat pbr shader
// medium: use an approximation of some values
//         there was an article i read at some point covering a few but i dont remember it :(
// low: phys inaccurate
//      ignore some components, simple matte lighting
//      diffuse is a quick lookup for ibl
//      specular i think is a quick lookup? we'll just use a naive ver and make it look good enough :D
#ifndef SHADER_QUALITY
  #define SHADER_QUALITY 2
#endif

#define MAX_REFLECTION_LOD 4.0

float distributionGGX(float, float);
vec3 importanceSampleGGX(vec2 Xi, vec3 N, float roughness);
vec3 importanceSampleGGX(vec2 Xi, vec3 N, float roughness, mat3 TBN);
float schlick(float, float);
float schlickSmith(float, float, float);
float schlickSmithIBL(float, float, float);
vec3 fresnel(float, vec3);
vec3 fresnelRough(float, vec3, float);

// https://learnopengl.com/PBR/IBL/Specular-IBL
vec3 importanceSampleGGX(vec2 Xi, vec3 N, float roughness) {
  vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(up, N));
  vec3 bitangent = normalize(cross(N, tangent));
  mat3 TBN = mat3(tangent, bitangent, N);
  return importanceSampleGGX(Xi, N, roughness, TBN);
}
vec3 importanceSampleGGX(vec2 Xi, vec3 N, float roughness, mat3 TBN) {
  float a = roughness * roughness;
  float a2 = a * a;

  float phi = 2.0 * PI * Xi.x;
  float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a2 - 1.0) * Xi.y));
  float sinTheta = sqrt(1.0 - cosTheta * cosTheta);

  // turns our randomly sampled value into a halfway vector spherical
  vec3 h = vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
  // tangent op
  return normalize(TBN * h);
}

#ifndef REMOVE_SKYBOX_PBR
// texture lookup can cause issues if acc included in vert shader
  vec3 pbr(vec3 pos, vec3 cam_pos, in samplerCube diffCube, in samplerCube specCube, in sampler2D brdfTexture, vec3 albedo, vec3 normal, float roughness, float metallic, float specRes) {
    vec3 N = normalize(normal);
    vec3 V = normalize(cam_pos - pos);
    float NdotV = max(dot(N, V), 0.0);

    vec3 R = reflect(-V, N);

    float lod = roughness * MAX_REFLECTION_LOD;
    #ifdef GL_EXT_shader_texture_lod
      vec3 specSample = textureCubeLodEXT(specCube, R, lod).rgb;
    #else
      // mipmap lookup from OGL 4.6 spec
      vec3 Rx = dFdx(R) * specRes;
      vec3 Ry = dFdy(R) * specRes;
      float dRx = dot(Rx, Rx);
      float dRy = dot(Ry, Ry);
      float dMaxSquared = max(dRx, dRy);
      float mipGuess = 0.5 * log2(dMaxSquared);
      // lod is desired mip
      // mipguess is estimated current mipmap level
      // lod - mipguess should mimic textureCubeLod behavior
      vec3 specSample = textureCube(specCube, R, lod - mipGuess).rgb;
    #endif

    vec3 F0 = mix(vec3(0.04 * step(0.001, metallic)), albedo, metallic);
    vec3 F = fresnelRough(NdotV, F0, roughness);

    vec3 ks = F;
    float rad = (1.0 - metallic);
    vec3 kd = vec3(rad) - ks * rad;

    vec3 diffuse = textureCube(diffCube, N).rgb * albedo;

    vec2 brdfTex = texture2D(brdfTexture, vec2(NdotV, roughness)).rg;
    vec3 specResult = specSample * (F * brdfTex.x + brdfTex.y);

    return kd * diffuse + specResult;
  }
#endif

vec3 _pbrHigh(vec3 pos, vec3 cam_pos, vec3 light_pos, vec3 light_color, vec3 albedo, vec3 normal, float roughness, float metallic) {
  vec3 N = normalize(normal);
  vec3 V = normalize(cam_pos - pos);
  vec3 L = normalize(light_pos - pos);
  vec3 H = normalize(L + V);

  float NdotL = max(dot(N, L), 0.0);
  float NdotV = max(dot(N, V), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  float HdotV = max(dot(H, V), 0.0);
  
  // light distro
  // if low: pow(NdotH, (some fudge of roughness to a power st low rough = high pow))
  // if med: use a function which doesn't cost as much :D
  float NDF = distributionGGX(NdotH, roughness);
  float G = schlickSmith(NdotV, NdotL, roughness);
  vec3 F0 = mix(vec3(0.04 * step(0.001, metallic)), albedo, metallic);
  vec3 F = fresnel(HdotV, F0);

  vec3 ks = F;
  float rad = (1.0 - metallic);
  vec3 kd = vec3(rad) - ks * rad;

  vec3 num = NDF * G * F;
  float denom = 4.0 * NdotV * NdotL;
  vec3 specular = num / max(denom, 0.0001);

  vec3 diffuse = albedo * kd / PI;
  return (specular + diffuse) * light_color * NdotL;
}

vec3 pbr(vec3 pos, vec3 cam_pos, vec3 light_pos, vec3 light_color, vec3 albedo, vec3 normal, float roughness, float metallic) {
  vec3 N = normalize(normal);
  vec3 V = normalize(cam_pos - pos);
  vec3 L = normalize(light_pos - pos);
  vec3 H = normalize(L + V);

  float NdotL = max(dot(N, L), 0.0);
  float NdotV = max(dot(N, V), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  float HdotV = max(dot(H, V), 0.0);
  
  // light distro
  // if low: pow(NdotH, (some fudge of roughness to a power st low rough = high pow))
  // if med: use a function which doesn't cost as much :D
  float NDF = distributionGGX(NdotH, roughness);
  float G = schlickSmith(NdotV, NdotL, roughness);
  vec3 F0 = mix(vec3(0.04 * step(0.001, metallic)), albedo, metallic);
  vec3 F = fresnel(HdotV, F0);

  vec3 ks = F;
  float rad = (1.0 - metallic);
  vec3 kd = vec3(rad) - ks * rad;

  vec3 num = NDF * G * F;
  float denom = 4.0 * NdotV * NdotL;
  vec3 specular = num / max(denom, 0.0001);

  vec3 diffuse = albedo * kd / PI;
  return (specular + diffuse) * light_color * NdotL;
}

float distributionGGX(float NdotH, float alpha) {
  float a2 = alpha * alpha;
  float denom_term = (NdotH * NdotH) * (a2 - 1.0) + 1.0;

  return a2 / (PI * denom_term * denom_term);
}

#define BLINN_PHONG_LOWER 1.0
#define BLINN_PHONG_UPPER 32.0
#define BLINN_PHONG_POWER 0.45

// x2 check this somewhere ig
// float distributionBlinnPhong(float NdotH, float alpha) {
  // raise alpha to power to crunch it a bit
  // map to a range of "1.0" to "idk 32.0" 
  // two pows kinda sucks
  // float distPow = mix(BLINN_PHONG_LOWER, BLINN_PHONG_UPPER, pow(rough, BLINN_PHONG_POWER));
  // return pow(NdotH, distPow);
// }


float schlick(float NdotV, float K) {
  return NdotV / (NdotV * (1.0 - K) + K);
}

float schlickSmith(float NdotV, float NdotL, float alpha) {
  float alph_num = (alpha + 1.0);
  float K = (alph_num * alph_num) * 0.125;

  float schlickSubV = schlick(NdotV, K);
  float schlickSubL = schlick(NdotL, K);

  return schlickSubV * schlickSubL;
}

float schlickSmithIBL(float NdotV, float NdotL, float alpha) {
  float K = (alpha * alpha) / 2.0;
  return schlick(NdotV, K) * schlick(NdotL, K);
}

vec3 fresnel(float HdotV, vec3 F0) {
  float one_minus_hv = (1.0 - HdotV);
  return mix(F0, vec3(1.0), pow(one_minus_hv, 5.0));
}

vec3 fresnelRough(float cosTheta, vec3 F0, float rough) {
  float cosClamp = max(min(1.0 - cosTheta, 1.0), 0.0);
  return mix(F0, max(vec3(1.0 - rough), F0), pow(cosClamp, 5.0));
}

