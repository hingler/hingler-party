// https://learnopengl.com/PBR/IBL/Specular-IBL

float VdC_binary(int n) {
  float invBase = 0.5;
  float result = 0.0;
  
  for (int i = 0; i < 32; i++) {
    if (n > 0) {
      result += mod(float(n), 2.0) * invBase;
      invBase = invBase / 2.0;
      n = int(float(n) / 2.0);
    }
  }

  return result;
}

vec2 HammersleyNoBits(int i, int n) {
  return vec2(float(i) / float(n), VdC_binary(i));
}