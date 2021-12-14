#include <version>

precision highp float;
precision highp int;

#include <env>
#include <compatibility>

#define STRUCT_ONLY
#include <../includes/spotlight/spotlight.inc.glsl>

// TODO: bitangents are already calculated as 
// part of tangent computation, so just toss them in
ATTRIB vec4 position;
ATTRIB vec3 normal;
ATTRIB vec2 texcoord;
ATTRIB vec3 tangent;

ATTRIB mat4 a_model_matrix;
ATTRIB mat3 a_normal_matrix;

uniform int is_instanced;

VARYING vec4 v_pos;
VARYING vec2 v_tex;
VARYING vec3 v_norm;
VARYING mat3 TBN;


uniform mat4 model_matrix;
uniform mat4 vp_matrix;
uniform mat3 normal_matrix;

uniform SpotLight spotlight[4];
uniform int spotlightCount;

VARYING vec4 spot_coord[4];

void main() {
  float modelstep = step(0.5, float(is_instanced));
  mat4 model_matrix_active = modelstep * a_model_matrix + (1.0 - modelstep) * model_matrix;
  mat3 normal_matrix_active = modelstep * a_normal_matrix + (1.0 - modelstep) * normal_matrix;

  v_pos = model_matrix_active * position;
  v_tex = texcoord;

  // calculate tbn matrix
  // note: normalizing a zero-vector leads to undefined behavior
  vec3 T = normal_matrix_active * tangent;
  vec3 N = normal_matrix_active * normal;
  vec3 B = cross(N, T);

  T = (length(T) > 0.0001 ? normalize(T) : T);
  B = (length(B) > 0.0001 ? normalize(B) : B);
  N = (length(N) > 0.0001 ? normalize(N) : N);

  v_norm = N;

  TBN = mat3(T, B, N);

  for (int i = 0; i < 4; i++) {
    if (i >= spotlightCount) {
      break;
    }

    spot_coord[i] = spotlight[i].lightTransform * v_pos;
  }

  gl_Position = vp_matrix * v_pos;
}