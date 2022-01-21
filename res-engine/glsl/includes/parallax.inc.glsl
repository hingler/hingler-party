#define PARALLAX_SAMPLE_COUNT_ 16
#define PARALLAX_HEIGHT_STEP_ 1.0 / float(PARALLAX_SAMPLE_COUNT_)

#include <compatibility>

/**
 *  Performs parallax sampling.
 *  @param height - sampler containing height data -- 1.0 = top, 0.0 = bottom
 *  @param texCoord - the texcoord we wish to begin sampling at.
 *  @param viewVecTan - the view vector, in tangent space.
 *  @param heightScale - affects the depth of the parallax effect.
 *  @returns the texcoords which we end up sampling at.
 */
vec2 parallaxSample(in sampler2D height, in vec2 texCoord, in vec3 viewVecTan, in float heightScale) {
  // scale viewVecTan by heightScale, then divide by PARALLAX_SAMPLE_COUNT_, and project it onto the plane (viewVecTan.xy)
  vec2 V = viewVecTan.xy * heightScale;
  V /= float(PARALLAX_SAMPLE_COUNT_);
  // store the last height sample, the current height sample, the last texcoord, and the current tex coord.
  float heightLast = TEXTURE2D(height, texCoord).r;
  float heightCur;
  vec2 texLast = texCoord;
  vec2 texCur;

  float vecHeight = 1.0 - PARALLAX_HEIGHT_STEP_;

  for (int i = 1; i < PARALLAX_SAMPLE_COUNT_; i++) {
    // for our depth samples: take a sample, step.
    texCur = texLast + V;
    heightCur = TEXTURE2D(height, texCur).r;
    if (heightCur > vecHeight) {
      break;
    }

    texLast = texCur;
    heightLast = heightCur;
    vecHeight -= PARALLAX_HEIGHT_STEP_;
  }

  // we know the collision occurred somewhere between texLast and texCur
  float vecHeightLast = vecHeight + PARALLAX_HEIGHT_STEP_;
  float deltaLast = vecHeightLast - heightLast;
  float deltaCur = vecHeight - heightCur;

  float mixCoeff = deltaLast / max(deltaLast - deltaCur, 0.00001);
  return texLast + V * mixCoeff;
}