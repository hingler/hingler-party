// requires precision specification
// TODO: have our parser eliminate redundant ver numbers (use highest) and precision specs (use highest)

struct Attenuation {
  float atten_const;
  float atten_linear;
  float atten_quad;
};

float calculateAttenFactor(Attenuation a, float dist) {
  return 1.0 / (a.atten_const + (a.atten_linear * dist) + (a.atten_quad * dist * dist));
}