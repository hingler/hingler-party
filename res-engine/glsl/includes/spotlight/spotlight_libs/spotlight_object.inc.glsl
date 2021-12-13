#include <../attenuation.inc.glsl>

struct SpotLight {
  // position of spot
  vec3 position;
  // direction of spot
  vec3 dir;

  // fov of spot (in rads)
  float fov;
  // falloff radius (0 = full falloff, 1 = hard cutoff)
  float falloffRadius;
  // intensity (0 - 1)
  float intensity;
  // color of light
  vec4 color;

  // mat4 which transforms from global coordinates to NDC from our light. correct for texcoord and lookup
  mat4 lightTransform;

  // attenuation factors for our light.
  Attenuation a;

  // size of the light's shadow map. can be ignored if this light does not have shadow map.
  vec2 shadowSize;
};