// thank you https://learnopengl.com/PBR/Theory

#include <constants.inc.glsl>

float distributionGGX(float, float);
float schlick(float, float);
float schlickSmith(float, float, float);
vec3 fresnel(float, vec3);

vec3 pbr(vec3 pos, vec3 cam_pos, vec3 light_pos, vec3 light_color, vec3 albedo, vec3 normal, float roughness, float metallic) {
  vec3 N = normalize(normal);
  vec3 V = normalize(cam_pos - pos);
  vec3 L = normalize(light_pos - pos);
  vec3 H = normalize(L + V);

  float NdotL = max(dot(N, L), 0.0);
  float NdotV = max(dot(N, V), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  float HdotV = max(dot(H, V), 0.0);

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

vec3 fresnel(float HdotV, vec3 F0) {
  float one_minus_hv = (1.0 - HdotV);
  return mix(F0, vec3(1.0), pow(one_minus_hv, 5.0));
}

