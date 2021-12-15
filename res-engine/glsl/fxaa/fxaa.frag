#include <version>

#include <compatibility>
#include <env>

precision highp float;

uniform sampler2D col;
uniform sampler2D lum;
uniform vec2 resolution;

OUTPUT_FRAGCOLOR

// still got the old fxaa
// probably implement a bit differently
// FXAA_QUALITY -> 2, high - 1, low - 0/other, off

#ifndef FXAA_QUALITY
  #define FXAA_QUALITY 2
#endif

#if (FXAA_QUALITY == 2)
  #define FXAA_TRIM 0.03125
  #define FXAA_TRIM_LOCAL 0.125
#elif (FXAA_QUALITY == 1)
  #define FXAA_TRIM 0.0625
  #define FXAA_TRIM_LOCAL 0.1866
#endif

VARYING vec2 vCoord;
// simple for now

float gLum(vec2 v) {
  return TEXTURE2D(lum, v).r;
}

float getEdgeStep(int i) {
  return pow(2.0, floor(float(i) * 0.5 + 1.0));
}

// https://catlikecoding.com/unity/tutorials/custom-srp/fxaa/
#if (FXAA_QUALITY > 0)
  vec4 fxaa(vec2 m) {
    vec2 o = vec2(1.0, 1.0) / resolution;
    
    vec2 n  = m + vec2(0.0, o.y);
    vec2 s  = m + vec2(0.0, -o.y);
    vec2 e  = m + vec2(o.x, 0.0);
    vec2 w  = m + vec2(-o.x, 0.0);
    float nL  = gLum(n);
    float sL  = gLum(s);
    float eL = gLum(e);
    float wL = gLum(w);

    float lumaMax = max(max(nL, sL), max(eL, wL));
    float lumaMin = min(min(nL, sL), min(eL, wL));
    float lumaRan = lumaMax - lumaMin;

    float lumTest = step(max(FXAA_TRIM, lumaMax * FXAA_TRIM_LOCAL), lumaRan);

    if (lumaRan < max(FXAA_TRIM, lumaMax * FXAA_TRIM_LOCAL)) {
      #ifdef DEBUG
        return vec4(vec3(0.0), 1.0);
      #else
        return TEXTURE2D(col, m);
      #endif
    }

    vec2 nw = m + vec2(-o.x, o.y);
    vec2 ne = m + vec2(o.x, o.y);
    vec2 sw = m + vec2(-o.x, -o.y);
    vec2 se = m + vec2(o.x, -o.y);

    float nwL = gLum(nw);
    float neL = gLum(ne);
    float mL  = gLum(m);
    float swL = gLum(sw);
    float seL = gLum(se);
    
    float phil = 2.0 * (nL + eL + sL + wL) + neL + nwL + seL + swL;
    phil *= 0.083333333333;
    phil = max(min(phil, 1.0), 0.0);
    phil = smoothstep(0.0, 1.0, abs(phil - mL) / lumaRan);
    phil *= phil;

    // compute edge orientation
    float horizontal = 2.0 * abs(nL - 2.0 * mL + sL)
      + abs(nwL - 2.0 * wL + swL)
      + abs(neL - 2.0 * eL + seL);

    float vertical = 2.0 * abs(wL - 2.0 * mL + eL)
      + abs(nwL - 2.0 * nL + neL)
      + abs(swL - 2.0 * sL + seL);

    float isHorizontal = step(vertical, horizontal);
    float isVertical = 1.0 - isHorizontal;
    vec2 stepSize = vec2(isVertical, isHorizontal) * o;

    // compute gradients in either direction of our step, plus and minus
    // blend into the pixel whose single step gradient is greater
    float pLum, nLum;
    pLum = isHorizontal * nL + isVertical * eL;
    nLum = isHorizontal * sL + isVertical * wL;

    // negative gradient is greater
    float gradP = mL - pLum;
    float gradN = mL - nLum;
    
    float dif = step(0.0, abs(gradP) - abs(gradN));

    stepSize *= (2.0 * dif - 1.0);
    float targLuma = pLum * dif + nLum * (1.0 - dif);
    float edgeGrad = gradP * dif + gradN * (1.0 - dif);

    float edgeLuma = (mL + targLuma) * 0.5;

    // edgestep perpendicular to our gradient
    vec2 edgeStep = vec2(isHorizontal, isVertical) * o;

    // land on the edge
    vec2 cur = m + (stepSize * 0.5);

    float gradThresh = abs(0.25 * edgeGrad);
    float lumGradPos, lumGradNeg;


    for (int i = 0; i < 8; i++) {
      cur += edgeStep * getEdgeStep(i);
      lumGradPos = gLum(cur) - edgeLuma;
      if (abs(lumGradPos) > gradThresh) {
        break;
      }
    }

    float distToEdgePos = length(cur - (m + stepSize * 0.5));

    cur = m + (stepSize * 0.5);

    for (int i = 0; i < 8; i++) {
      cur -= edgeStep * getEdgeStep(i);
      lumGradNeg = gLum(cur) - edgeLuma;
      if (abs(lumGradNeg) > gradThresh) {
        break;
      }
    }

    float distToEdgeNeg = length(cur - (m + stepSize * 0.5));

    float pos = step(distToEdgePos, distToEdgeNeg);
    float delta = (pos * lumGradPos + (1.0 - pos) * lumGradNeg);

    // 0 if same, 1 if diff
    float comp = abs(step(0.0, delta) - step(0.0, edgeGrad));
    float edgeFilter = 0.5 - (min(distToEdgePos, distToEdgeNeg) / (distToEdgePos + distToEdgeNeg));
    phil = max(phil, comp * edgeFilter);

    // return vec4(vec3(phil), 1.0);
    #ifdef DEBUG
      return vec4(1.0, 0.0, 0.0, 1.0);
    #else
      return TEXTURE2D(col, m + stepSize * phil);
    #endif
  }
#else
 vec4 fxaa(vec2 m) {
   return TEXTURE2D(col, m);
 }
#endif


void main() {
  fragColor = fxaa(vCoord);
}