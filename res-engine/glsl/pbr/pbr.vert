#include <version>

precision highp float;
precision highp int;

#include <env>
#include <compatibility>

#define STRUCT_ONLY
#include <../includes/spotlight/spotlight.inc.glsl>

#define BONE_COUNT 32

// TODO: bitangents are already calculated as 
// part of tangent computation, so just toss them in
ATTRIB vec4 position;
ATTRIB vec3 normal;
ATTRIB vec2 texcoord;
ATTRIB vec3 tangent;

// skeletal animation
ATTRIB vec4 joints;
ATTRIB vec4 weights;


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

uniform mat4 jointMatrix[BONE_COUNT];

// do you think god stays in heaven because he too lives in fear of what he's created
uniform mat3 jointMatrixNormal[BONE_COUNT];

uniform int useSkeletalAnimation;

VARYING vec4 spot_coord[4];

void main() {
  float modelstep = float(is_instanced);
  mat4 model_matrix_active = modelstep * a_model_matrix + (1.0 - modelstep) * model_matrix;
  mat3 normal_matrix_active = modelstep * a_normal_matrix + (1.0 - modelstep) * normal_matrix;

  vec4 pos_pose = vec4(0.0);
  vec3 norm_pose = vec3(0.0);
  vec3 tan_pose = vec3(0.0);

  pos_pose += (jointMatrix[int(joints.x)] * position) * weights.x;
  pos_pose += (jointMatrix[int(joints.y)] * position) * weights.y;
  pos_pose += (jointMatrix[int(joints.z)] * position) * weights.z;
  pos_pose += (jointMatrix[int(joints.w)] * position) * weights.w;

  norm_pose += (jointMatrixNormal[int(joints.x)] * normal) * weights.x;
  norm_pose += (jointMatrixNormal[int(joints.y)] * normal) * weights.y;
  norm_pose += (jointMatrixNormal[int(joints.z)] * normal) * weights.z;
  norm_pose += (jointMatrixNormal[int(joints.w)] * normal) * weights.w;

  tan_pose += (jointMatrixNormal[int(joints.x)] * tangent) * weights.x;
  tan_pose += (jointMatrixNormal[int(joints.y)] * tangent) * weights.y;
  tan_pose += (jointMatrixNormal[int(joints.z)] * tangent) * weights.z;
  tan_pose += (jointMatrixNormal[int(joints.w)] * tangent) * weights.w;

  float skeletal = float(useSkeletalAnimation);

  vec4 position_final = (skeletal * pos_pose + (1.0 - skeletal) * position);
  vec3 normal_final = normalize(skeletal * norm_pose + (1.0 - skeletal) * normal);
  vec3 tangent_final = normalize(skeletal * tan_pose + (1.0 - skeletal) * tangent);

  v_pos = model_matrix_active * position_final;
  v_tex = texcoord;

  // calculate tbn matrix
  // note: normalizing a zero-vector leads to undefined behavior
  vec3 T = normal_matrix_active * tangent_final;
  vec3 N = normal_matrix_active * normal_final;
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