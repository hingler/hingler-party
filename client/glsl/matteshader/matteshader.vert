#version 100

precision highp float;
precision highp int;

#include <../includes/spotlight/spotlight.inc.glsl>

attribute vec4 position;
attribute vec3 normal;

uniform mat4 model_matrix;
uniform mat4 vp_matrix;
uniform mat3 normal_matrix;

// TODO:
// - convert to array of spotlights
// - convert varying to array of spotlights as well
// - model object uses shitty workaround which doesn't handle textures, replace that
// - add ambient lights :)
uniform SpotLight spotlight[4];
uniform int spotlightCount;

varying vec4 spot_coord[4];

varying vec4 position_v;
varying vec3 normal_v;

void main() {
  position_v = model_matrix * position;
  normal_v = normalize(normal_matrix * normal);
  for (int i = 0; i < 4; i++) {
    if (i >= spotlightCount) {
      break;
    }
    
    spot_coord[i] = spotlight[i].lightTransform * position_v;
  }

  gl_Position = vp_matrix * model_matrix * position;
}

