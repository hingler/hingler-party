#include <version>

precision highp float;
precision highp int;

#include <compatibility>

#include <../includes/spotlight/spotlight.inc.glsl>

ATTRIB vec4 position;
ATTRIB vec3 normal;

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

VARYING vec4 spot_coord[4];

VARYING vec4 position_v;
VARYING vec3 normal_v;

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

