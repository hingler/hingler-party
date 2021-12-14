#include <spotlight/object>

#ifndef SHADOW_SAMPLE_RESOLUTION
  #define SHADOW_SAMPLE_RESOLUTION 4.0
#endif

#define SHADOW_SAMPLE_END (SHADOW_SAMPLE_RESOLUTION / 2.0)
#define SHADOW_SAMPLE_START -SHADOW_SAMPLE_END + 0.5

/**
 *  Fetches the color of the spotlight at a given position.
 *    @param s - spotlight object in question :)
 *    @param pos - position of geometry being lit
 *  - if spotlight has a shadow texture:
 *    @param light_pos - position of our geometry in spotlight's NDC coordinates
 *    @param tex - shadow texture
 *    @returns color of light at <pos>.
 */
vec4 getSpotLightColor(SpotLight s, vec3 pos);
vec4 getSpotLightColor(SpotLight s, vec3 pos, vec4 light_pos, in sampler2D tex);

/**
 *  Samples the shadow texture and returns.
 *    @param s - spotlight object in question
 *    @param pos - geometry position
 *    @param light_pos - position of geometry in light NDC
 *    @param tex - shadow texture
 *    @returns intensity of light given shadow texture.
 */
float getShadowTexture(SpotLight s, vec3 pos, vec4 light_pos, in sampler2D tex);

vec4 getSpotLightColor(SpotLight s, vec3 pos) {
  vec3 dist = (pos - s.position);
  float intensity = calculateAttenFactor(s.a, length(dist)) * s.intensity;
  float aoi = acos(dot(normalize(dist), normalize(s.dir)));
  float cut = s.fov * 0.5;
  float rad = aoi / cut;

  // falloff
  intensity *= min(max(0.0, (1.0 - rad) / (s.falloffRadius + abs(SHADOW_BIAS))), 1.0);

  return intensity * s.color;
}

vec4 getSpotLightColor(SpotLight s, vec3 pos, vec4 light_pos, in sampler2D shadowtex) {
  vec4 final_color = getSpotLightColor(s, pos);
  float shadowprop = getShadowTexture(s, pos, light_pos, shadowtex);

  return shadowprop * final_color;
}

float sampleShadow(vec3 pos_ndc, in sampler2D shadowtex, vec2 sample_tex, vec2 tex_size) {
  vec2 shadow_step = 1.0 / tex_size;
  float coll = 0.0;
  for (float i = SHADOW_SAMPLE_START; i < SHADOW_SAMPLE_END; i += 1.0) {
    for (float j = SHADOW_SAMPLE_START; j < SHADOW_SAMPLE_END; j += 1.0) {
      vec2 pos_tex = sample_tex + (shadow_step * vec2(i, j));
      float shadow_dist = TEXTURE2D(shadowtex, pos_tex).r + SHADOW_BIAS;
      float rawDist = (pos_ndc.z - shadow_dist);
      coll += 1.0 - step(0.0, rawDist);
    }
  }

  coll /= (SHADOW_SAMPLE_RESOLUTION * SHADOW_SAMPLE_RESOLUTION);
  return coll;
}

