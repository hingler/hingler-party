/**
 *  Computes a bump map from a series of samples.
 */
vec3 bump(float x_n, float x_p, float y_n, float y_p, float uv_delta, float scale) {
  // x diff: (uv_delta on X, 0 on Y, (difference computation * scale) on Z)
  // y diff: (0 on X, uv_delta on Y, (difference computation * scale) on Z)
  // normalize x and y, take cross product to get normal vector

  float x_diff = x_p - x_n;
  float y_diff = y_p - y_n;

  vec3 tangent = normalize(vec3(uv_delta, 0.0, x_diff * scale));
  vec3 bitangent = normalize(vec3(0.0, uv_delta, y_diff * scale));

  vec3 res = cross(tangent, bitangent);
  // must face in positive z direction
  res = res * (res.z > 0.0 ? 1.0 : -1.0);
  return normalize(res);
}