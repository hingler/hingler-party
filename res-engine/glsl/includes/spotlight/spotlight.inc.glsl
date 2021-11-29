#include <spotlight/object>

// only include all this shader code if we absolutely need it
#ifndef STRUCT_ONLY
#define SHADOW_BIAS -0.000001

// one solution would be including by default from some engine location (quotes vs angle brackets)

#include <../pbr.inc.glsl>
#include <spotlight/light>

/**
 *  Alternative pipeline which implements a simpler shading model for performance.
 *  @param s- the spotlight which lights the scene.
 *  @param cam_pos - the position of the camera
 *  @param geom_pos - the position in world space of the fragment being lit.
 *  @param shadow_tex_pos - (optional) the position of the fragment wrt the light's shadow texture coords
 *  @param albedo - the color of the surface.
 *  @param norm - the normal at the given fragment.
 *  @param rough - the roughness of the surface.
 *  @aram shadow_tex - (optional) if shadow_tex_pos is defined, this must contain the sampler which represents the shadow map.
 */ 
// vec4 getSpotLightColorSimple(in SpotLight s, vec3 cam_pos, vec3 geom_pos,                      vec3 albedo, vec3 norm, float rough, float metal);
// vec4 getSpotLightColorSimple(in SpotLight s, vec3 cam_pos, vec3 geom_pos, vec4 shadow_tex_pos, vec3 albedo, vec3 norm, float rough, float metal, in sampler2D shadow_tex);

/**
 *  Uses PBR pipeline to get spotlight color.
 *  @param s - the spotlight which lights the scene.
 *  @param cam_pos - the position of the camera.
 *  @param geom_pos - the position of our geometry.
 *  @param shadow_tex_pos - the position of our geometry with respect to NDC coordinates of our spotlight.
 *  @param albedo - RGB color of the point in question.
 *  @param norm - normal at point in question
 *  @param rough - roughness of surface at point
 *  @param shadow_tex - (optional) shadow texture at point.
 */
vec4 getSpotLightColorPBR(SpotLight s, vec3 cam_pos, vec3 geom_pos,                      vec3 albedo, vec3 norm, float rough, float metal);
vec4 getSpotLightColorPBR(SpotLight s, vec3 cam_pos, vec3 geom_pos, vec4 shadow_tex_pos, vec3 albedo, vec3 norm, float rough, float metal, in sampler2D shadow_tex);


vec4 getSpotLightColorPBR(SpotLight s, vec3 cam_pos, vec3 geom_pos, vec3 albedo, vec3 norm, float rough, float metal) {
  vec3 col = pbr(geom_pos, cam_pos, s.position.xyz, s.color.rgb, albedo, norm, rough, metal) * s.intensity;
  vec3 dist = (geom_pos - s.position);
  col *= calculateAttenFactor(s.a, length(dist));
  float aoi = acos(dot(normalize(dist), normalize(s.dir)));
  float cut = s.fov / 2.0;
  // radius wrt fov --  1.0 = edge of lit area
  float rad = aoi / cut;

  col *= min(max(0.0, (1.0 - rad) / (s.falloffRadius + SHADOW_BIAS)), 1.0);

  return vec4(col, 1.0);
}

vec4 getSpotLightColorPBR(SpotLight s, vec3 cam_pos, vec3 geom_pos, vec4 shadow_tex_pos, vec3 albedo, vec3 norm, float rough, float metal, in sampler2D shadow_tex) {
  vec4 col = getSpotLightColorPBR(s, cam_pos, geom_pos, albedo, norm, rough, metal);
  // sample several shadow locations for this

  float shadowprop = getShadowTexture(s, geom_pos, shadow_tex_pos, shadow_tex);

  return vec4(shadowprop * col.rgb, 1.0);
}

/**
 * Determines whether or not the provided position is lit.
 * @param tex - the shadow texture.
 * @param shadowTransform - the matrix which transforms from world space to our shadow.
 * @param pos - the world position which we are checking.
 * @returns 1 if the position is lit by the light, 0 otherwise.
 */
float getShadowTexture(SpotLight s, vec3 pos, vec4 light_pos, in sampler2D shadowtex) {
  vec4 pos_ndc = light_pos;
  pos_ndc /= pos_ndc.w;
  float depth = pos_ndc.z;
  pos_ndc *= 0.5;
  pos_ndc += 0.5;
  float shadowRes = sampleShadow(pos_ndc.xyz, shadowtex, pos_ndc.xy, s.shadowSize);
  // vec2 pos_tex = pos_ndc.xy;
  // float shadow_dist = texture2D(shadowtex, pos_tex).r + SHADOW_BIAS;
  // float rawDist = (pos_ndc.z - shadow_dist);
  return shadowRes;
}

#endif
