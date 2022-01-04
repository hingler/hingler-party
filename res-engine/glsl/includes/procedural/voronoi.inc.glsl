#include <perlin>

#include <random>

float voronoiWiggle1D(vec3 seed, float t) {
  float noise_floor = noise3d(vec3(seed.xy, seed.z + floor(t)));
  float noise_ceil = noise3d(vec3(seed.xy, seed.z + ceil(t)));
  float mix_pct = fract(t);
  return smoothstep(noise_floor, noise_ceil, mix_pct);
}

/**
 *  Wiggle function for voronoi noise.
 *  @param seed - vec2 seed for noise.
 *  @param t - wiggle time.
 */
vec2 voronoiWiggle(vec2 seed, float t) {
  float noise_x = voronoiWiggle1D(vec3(seed.xy, 1.0), t);
  float noise_y = voronoiWiggle1D(vec3(seed.xy, -1.0), t + 0.5);

  return vec2(noise_x, noise_y);
}

// l2 - l1 for simple edge distance

float voronoi(vec2 pos, float scale, float t) {
  vec2 nearestPoint = vec2(0.0);
  float L1 = 99999.9;
  float L2 = 99999.9;

  vec2 activePos = pos * scale;
  vec2 floorPos = floor(activePos);

  
  
  for (int i = -2; i <= 2; i++) {
    for (int j = -2; j <= 2; j++) {
      vec2 voronoiCenter = floorPos + vec2(float(i), float(j)) + vec2(0.5);
      // -1, -1 -> -1.5, -1.5 -- from center, visit 1 square away
      voronoiCenter += 1.5 * voronoiWiggle(voronoiCenter, t);
      float dist = length(voronoiCenter - activePos);
      if (dist < L1) {
        L1 = dist;
        nearestPoint = voronoiCenter;
      } else if (dist < L2) {
        L2 = dist;
      }
    }
  }

  return hash(nearestPoint);
}

