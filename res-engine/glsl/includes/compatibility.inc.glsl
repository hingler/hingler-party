// bridges some of the gaps between webgl1 and webgl2
#include <env>
#if (WEBGL_VERSION == 2)
  #if (VERT == 1)
    #define VARYING out
  #else
    #define VARYING in
  #endif

  #define ATTRIB in

  #define TEXTURE2D texture
  #define TEXTURECUBE texture
  #define TEXTURECUBELOD textureLod
  #define OUTPUT_FRAGCOLOR out vec4 fragColor
#else
  #define VARYING varying
  #define ATTRIB attribute
  #define TEXTURE2D texture2D
  #define TEXTURECUBE textureCube
  #define TEXTURECUBELOD textureCubeLodEXT
  #define OUTPUT_FRAGCOLOR 
  #define fragColor gl_FragColor
#endif