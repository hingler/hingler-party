#version 100
#extension GL_EXT_shader_texture_lod : enable
#extension GL_OES_standard_derivatives : enable

precision highp float;
precision highp int;
precision highp sampler2D;


#include <../includes/ambient.inc.glsl>
#include <../includes/spotlight/spotlight.inc.glsl>

uniform SpotLight spotlight[4];
uniform sampler2D texture_spotlight[4];
uniform int spotlightCount;
varying vec4 spot_coord[4];

uniform SpotLight spotlight_no_shadow[4];
uniform int spotlightCount_no_shadow;

uniform AmbientLight ambient[4];
uniform int ambientCount;

varying vec4 v_pos;
varying vec3 v_norm;
varying vec2 v_tex;
varying mat3 TBN;

uniform vec3 camera_pos;

uniform sampler2D tex_albedo;
uniform sampler2D tex_norm;
uniform sampler2D tex_metal_rough;
uniform sampler2D tex_emission;

// 1 if the respective textures are to be used
// 0 otherwise
uniform int use_albedo;
uniform int use_norm;
uniform int use_metal_rough;
uniform int use_emission;

// defaults for color and rough if not texture
// (normal uses v_norm)
uniform vec4 color_factor;
uniform float rough_factor;
uniform float metal_factor;
// add sampler for this if necc.
uniform vec4 emission_factor;

// fattest shader so far
// 224 uniforms, 16 texture units seems like a reasonable limit
// we'll query for those on launch and omit clients which fall below them
uniform samplerCube irridance;
uniform samplerCube specular;
uniform sampler2D brdf;
uniform float specSize;
uniform float skyboxIntensity;
uniform int useIrridance;

uniform samplerCube irridance_l;
uniform samplerCube specular_l;
// no need to bind a second brdf cube
uniform float specSize_l;
uniform float skyboxIntensity_l;
uniform int useIrridance_l;

void main() {
  // get albedo map at tex, use as surf color, store in vec3 col;
  vec4 colAlpha = texture2D(tex_albedo, v_tex);
  vec3 C = colAlpha.rgb * color_factor.rgb;
  if (use_albedo == 0) {
    C = color_factor.xyz;
  } else if (colAlpha.a < 0.5) {
    discard;
  }

  vec3 N = v_norm;
  // https://learnopengl.com/Advanced-Lighting/Normal-Mapping
  vec3 norm_tex = normalize(texture2D(tex_norm, v_tex).rgb * 2.0 - 1.0);
  N = TBN * norm_tex * step(0.5, float(use_norm)) + N * step(float(use_norm), 0.5);

  // get rough at tex, use as roughness, store in float rough;
  vec2 metal_rough = texture2D(tex_metal_rough, v_tex).bg;
  float metal = metal_rough.x * metal_factor;
  float rough = metal_rough.y * rough_factor;

  metal += metal_factor * float(1 - use_metal_rough);
  rough += rough_factor * float(1 - use_metal_rough);

  if (use_metal_rough == 0) {
    metal = metal_factor;
    rough = rough_factor;
  }

  vec4 col = vec4(0.0);
  for (int i = 0; i < 4; i++) {
    if (i >= spotlightCount) {
      break;
    }

    col += getSpotLightColorPBR(spotlight[i], camera_pos, v_pos.xyz, spot_coord[i], C, N, rough, metal, texture_spotlight[i]);
  }

  for (int i = 0; i < 4; i++) {
    if (i >= spotlightCount_no_shadow) {
      break;
    }

    col += getSpotLightColorPBR(spotlight_no_shadow[i], camera_pos, v_pos.xyz, C, N, rough, metal);
  }

  for (int i = 0; i < 4; i++) {
    if (i >= ambientCount) {
      break;
    }

    col += vec4(C, 1.0) * getAmbientColor(ambient[i]);
  }

  if (useIrridance > 0) { 
    col += vec4(pbr(v_pos.xyz, camera_pos, irridance, specular, brdf, C, N, rough, metal, specSize).rgb * skyboxIntensity, 0.0);
  }

  if (useIrridance_l > 0) {
    col += vec4(pbr(v_pos.xyz, camera_pos, irridance_l, specular_l, brdf, C, N, rough, metal, specSize_l).rgb * skyboxIntensity_l, 0.0);
  }

  if (use_emission == 0) {
    col += vec4(emission_factor.rgb, 0.0);
  } else {
    col += vec4(texture2D(tex_emission, v_tex).rgb, 0.0);
  }

  gl_FragColor = vec4(pow(col.xyz, vec3(1.0 / 2.2)), 1.0);
}