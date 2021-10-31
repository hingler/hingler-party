struct AmbientLight {
  vec4 color;
  float intensity;
};

vec4 getAmbientColor(AmbientLight a) {
  return a.color * a.intensity;
}