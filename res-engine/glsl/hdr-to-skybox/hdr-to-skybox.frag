#include <version>

precision highp float;

#include <constants>
#include <compatibility>

VARYING vec2 vCoord;

uniform vec3 center;
uniform vec3 right;
uniform vec3 up;

uniform sampler2D tex;

OUTPUT_FRAGCOLOR;

void main() {
  vec3 skyCoord = normalize(center + (right * vCoord.x) + (up * vCoord.y));

  // if x is 0, atan is undefined
  // write a safeguard for that case later
  // theta [0, 2PI]
  // phi   [-PI/2, PI/2]
  vec2 sphereCoord = vec2(
    atan(-skyCoord.z, -skyCoord.x) + PI,
    atan(skyCoord.y, length(skyCoord.xz))
  );

  vec2 hdrCoord = vec2(sphereCoord.x / (2.0 * PI), (sphereCoord.y / PI) + 0.5);
  fragColor = TEXTURE2D(tex, hdrCoord);
}