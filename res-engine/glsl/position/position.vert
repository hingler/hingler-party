#include <version>

precision highp float;

#include <compatibility>

#define BONE_COUNT 32

ATTRIB vec4 position;

ATTRIB vec4 joints;
ATTRIB vec4 weights;

uniform mat4 jointMatrix[BONE_COUNT];
uniform int useSkeletalAnimation;

uniform mat4 modelMatrix;
uniform mat4 vpMatrix;

VARYING vec4 vPosition;

void main() {

  vec4 pos_pose = vec4(0.0);

  pos_pose += (jointMatrix[int(joints.x)] * position) * weights.x;
  pos_pose += (jointMatrix[int(joints.y)] * position) * weights.y;
  pos_pose += (jointMatrix[int(joints.z)] * position) * weights.z;
  pos_pose += (jointMatrix[int(joints.w)] * position) * weights.w;

  float skeletal = float(useSkeletalAnimation);

  vec4 position_final = (skeletal * pos_pose + (1.0 - skeletal) * position);

  vPosition = modelMatrix * position_final;
  gl_Position = (vpMatrix * vPosition);
}