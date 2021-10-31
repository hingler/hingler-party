#version 100

precision highp float;
precision highp int;

#include <../includes/spotlight/spotlight.inc.glsl>

// come up with some vector where spotlight structs do not include a texture
// just make it a null if relevant tbh and then just skip it in shader
// have the struct figure it out
// would also help if we had a macro which made names consistent
uniform SpotLight spotlight[4];
uniform sampler2D texture_spotlight[4];

uniform int spotlightCount;

varying vec4 spot_coord[4];

uniform SpotLight spotlight_no_shadow[16];

uniform int spotlightCount_no_shadow;

varying vec4 position_v;
varying vec3 normal_v;

uniform vec4 surface_color;

uniform vec3 camera_pos;


void main() {
  vec4 col = vec4(0.0);
  for (int i = 0; i < 4; i++) {
    if (i >= spotlightCount) {
      break;
    }

    vec3 light_vector = spotlight[i].position - position_v.xyz;
    light_vector = normalize(light_vector);
    float n_b = max(dot(light_vector.xyz, normal_v), 0.0);
    // col += getSpotLightColorPBR(spotlight[i], camera_pos, position_v.xyz, spot_coord[i], surface_color.rgb, normal_v, 0.35, 0.0, texture_spotlight[i]);
    vec4 light_col = getSpotLightColor(spotlight[i], position_v.xyz);
    col += n_b * light_col;
  }

  for (int i = 0; i < 16; i++) {
    if (i >= spotlightCount_no_shadow) {
      break;
    }

    vec3 light_vector = spotlight_no_shadow[i].position - position_v.xyz;
    light_vector = normalize(light_vector);
    float n_b = max(dot(light_vector.xyz, normal_v), 0.0);
    vec4 light_col = getSpotLightColor(spotlight_no_shadow[i], position_v.xyz);
    col += n_b * light_col;
  }

  gl_FragColor = vec4(col.xyz, 1.0);
}