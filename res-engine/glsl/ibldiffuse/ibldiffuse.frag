#include <version>

precision highp float;

#include <constants>
#include <compatibility>

VARYING vec2 vCoord;

// 33k samples per pixel
// i think thats fine :(

// avoid this on lower spec platforms probably :(
// todo: encode steps programatically based on spec ibl size
#define STEPS_PHI 96
#define STEPS_THETA 288

uniform vec3 up;
uniform vec3 right;
uniform vec3 center;

uniform samplerCube skybox;

OUTPUT_FRAGCOLOR

// calculate coord from up+right+center
// reuse up to get right for tangent space
// use for our sphere coords

void main() {
  // fwd
  vec3 N = normalize(center + (right * vCoord.x) + (up * vCoord.y));
  // right
  vec3 T = normalize(cross(up, N));
  // up
  vec3 B = normalize(cross(N, T));
  mat3 norm_mat = mat3(T, B, N);

  float phiStep = 0.5 * (PI / float(STEPS_PHI));
  float thetaStep = 2.0 * (PI / float(STEPS_THETA));
  float phi = 0.0;
  float theta;

  vec3 res = vec3(0.0);

  float sinPhi;
  for (int i = 0; i < STEPS_PHI; i++) {
    theta = 0.0;
    for (int j = 0; j < STEPS_THETA; j++) {
      // https://learnopengl.com/PBR/IBL/Diffuse-irradiance i couldnt get it working :(((
      sinPhi = sin(phi);
      vec3 boxSample = normalize(vec3(sinPhi * cos(theta), sinPhi * sin(theta), cos(phi)));
      boxSample = boxSample.x * T + boxSample.y * B + boxSample.z * N;
      // mipmap filtering incurred because we downsample hdr texture
      // 256x cubemap -> 32x cubemap should incur 3.0 abs bias

      res += TEXTURECUBE(skybox, boxSample, 0.0).rgb * cos(phi) * sin(phi);

      theta += thetaStep;
    }

    phi += phiStep;
  }

  fragColor = vec4(PI * res / float(STEPS_PHI * STEPS_THETA), 1.0);
}