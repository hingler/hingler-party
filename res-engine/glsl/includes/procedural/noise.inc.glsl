#include <perlin>

float wrapFractalPerlin2d(vec2 uv, float scale, int octaves) {
  float res;
  float ut = fract(uv.x);
  float vt = fract(uv.y);

  vec2 fractUV = fract(uv);

  vec2 sampleUV = fractUV * scale;

  res += (ut * vt * fractalPerlin2d(sampleUV - vec2(scale, scale), octaves));
  res += (ut * (1.0 - vt) * fractalPerlin2d(sampleUV - vec2(scale, 0.0), octaves));
  res += ((1.0 - ut) * vt * fractalPerlin2d(sampleUV - vec2(0.0, scale), octaves));
  res += ((1.0 - ut) * (1.0 - vt) * fractalPerlin2d(sampleUV, octaves));
  return res;
}