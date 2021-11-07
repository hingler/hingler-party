// https://learnopengl.com/PBR/IBL/Specular-IBL

float VanDerCorput(int n, int base) {
  float invBase = 1.0 / float(base);
  float denom = 1.0;
  float result = 0.0;

  for (int i = 0; i < 32; i++) {
    if (n > 0) {
      denom = mod(float(n), 2.0);
      result += denom * invBase;
      invBase = invBase / 2.0;
      n = int(float(n) / 2.0);
    }
  }

  return result;
}

vec2 HammersleyNoBits(int i, int n) {
  return vec2(float(i) / float(n), VanDerCorput(i, 2));
}