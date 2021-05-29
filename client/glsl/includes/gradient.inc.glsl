vec4 getGradient(vec4[4] cols, float[4] stops, float grad);

vec4 getGradient(vec4[4] cols, float[4] stops, float grad) {
  if (grad < stops[0]) {
    return cols[0];
  }

  for (int i = 1; i < 4; i++) {
    if (grad >= stops[i - 1] && grad <= stops[i]) {
      float dist = stops[i] - stops[i - 1];
      float t = (grad - stops[i - 1]) / dist;
      return mix(cols[i - 1], cols[i], t);
    }
  }
  
  return cols[3];
}