// implementation of perlin noise

#include <random>

float fade(float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

vec3 fade(vec3 t) {
  return vec3(fade(t.x), fade(t.y), fade(t.z));
}

vec2 fade(vec2 t) {
  return vec2(fade(t.x), fade(t.y));
}

// gets gradient for a corner
float grad(vec3 corner, vec3 pos) {
  float h = hash(corner) * 16.0;
  // 1 or -1 for each coord
  vec2 data = vec2(step(mod(h, 4.0), 2.0) * 2.0 - 1.0, step(mod(h, 2.0), 1.0) * 2.0 - 1.0);
  // use floor div 4 to determine which coords to use
  int c = int(h / 4.0);

  vec3 grad;
  // remove branching?
  if (c == 0) {
    grad = vec3(data.xy, 0.0);
  } else if (c == 1) {
    grad = vec3(data.x, 0.0, data.y);
  } else {
    grad = vec3(0.0, data.xy);
  }

  return dot(grad, pos);
}

float grad(vec2 corner, vec2 pos) {
  float h = hash(corner) * 4.0;
  vec2 data = vec2(step(mod(h, 4.0), 2.0) * 2.0 - 1.0, step(mod(h, 2.0), 1.0) * 2.0 - 1.0);
  return dot(data, pos);
}

// no grad!!!
float noise3d(vec3 point) {
  vec3 aaa = floor(point);
  vec3 aab = aaa + vec3(0.0, 0.0, 1.0);
  vec3 aba = aaa + vec3(0.0, 1.0, 0.0);
  vec3 abb = aab + vec3(0.0, 1.0, 0.0);
  vec3 baa = aaa + vec3(1.0, 0.0, 0.0);
  vec3 bab = aab + vec3(1.0, 0.0, 0.0);
  vec3 bba = aba + vec3(1.0, 0.0, 0.0);
  vec3 bbb = abb + vec3(1.0, 0.0, 0.0);

  vec3 t = fade(point - aaa);

  float z_aa = mix(grad(aaa, point - aaa), grad(aab, point - aab), t.z);
  float z_ab = mix(grad(aba, point - aba), grad(abb, point - abb), t.z);
  float z_ba = mix(grad(baa, point - baa), grad(bab, point - bab), t.z);
  float z_bb = mix(grad(bba, point - bba), grad(bbb, point - bbb), t.z);

  float y_a = mix(z_aa, z_ab, t.y);
  float y_b = mix(z_ba, z_bb, t.y);
  return mix(y_a, y_b, t.x);
}

float noise2d(vec2 point) {
  vec2 aa = floor(point);
  vec2 ab = aa + vec2(0.0, 1.0);
  vec2 ba = aa + vec2(1.0, 0.0);
  vec2 bb = ab + vec2(1.0, 0.0);

  vec2 t = fade(point - aa);

  float y_a = mix(grad(aa, point - aa), grad(ab, point - ab), t.y);
  float y_b = mix(grad(ba, point - ba), grad(bb, point - bb), t.y);

  return mix(y_a, y_b, t.x);
}