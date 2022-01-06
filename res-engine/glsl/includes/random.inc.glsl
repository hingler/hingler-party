// https://learnopengl.com/PBR/IBL/Specular-IBL

#include <constants>

#define RAND_SEED_3D vec3(144.22114, 81623.114, 2256.895)
#define RAND_SEED_2D vec2(12.9898, 78.233)

float VdC_binary(int n) {
  float invBase = 0.5;
  float result = 0.0;
  
  for (int i = 0; i < 32; i++) {
    if (n > 0) {
      result += mod(float(n), 2.0) * invBase;
      invBase = invBase / 2.0;
      n = int(float(n) / 2.0);
    }
  }

  return result;
}

vec2 HammersleyNoBits(int i, int n) {
  return vec2(float(i) / float(n), VdC_binary(i));
}

float hash(vec3 corner) {
  return fract(sin(dot(corner, RAND_SEED_3D)) * 13416.112358);
}

float hash(vec2 corner) {
  return fract(sin(dot(corner, RAND_SEED_2D)) * 43758.5453);
}

// Gold Noise ©2015 dcerisano@standard3d.com
// https://www.shadertoy.com/view/ltB3zD
float goldnoise(in vec3 coord) {
  vec3 effCoord = coord * 1000.0;
  return fract(tan(distance(effCoord.xy * PHI, effCoord.xy) * effCoord.z) * effCoord.x);
}

// todo: define webgl2 integer noise funcs?