#define MAX_STEPS 512

// calculates radial blur given sampler, radius, steps
// @param src    - source texture
// @param center - center of the blur effect
// @param sample - the point to sample from
// @param radius - size, in texcoord units, of blur
// @param steps  - number of blur steps
vec4 radialBlur(in sampler2D src, vec2 center, vec2 sample, float radius, int steps);

vec4 radialBlur(in sampler2D src, vec2 center, vec2 sample, float radius, int steps) {
  radius = max(min(radius, 1.0), -1.0);

  // multiply radius by our sampled step
  // linear steps for now ig
  float step_size = 1.0 / float(steps - 1);
  float cur = 0.0;


  vec2 dir = sample - center;
  dir = dir / length(dir);
  vec2 adv = step_size * dir;
  // get dist to center
  // dont fuck w it i dont think
  // step along by radius * cur probably
  // sample, add
  // return sum
  // (add some weighting to base color?)

  vec4 res = vec4(0.0);
  float weight = 0.0;
  vec2 pt = sample;
  for (int i = 0; i < MAX_STEPS; i++) {
    if (i >= steps) {
      break;
    }

    vec4 colsample = texture2D(src, pt);
    cur += step_size;
    pt = sample - ((radius * cur) * dir);

    // if (pt.x < 0.0 || pt.x > 1.0 || pt.y < 0.0 || pt.y > 1.0) {
    //   continue;
    // }

    res += colsample;
    weight += 1.0;
  }

  res /= weight;
  return res;
}