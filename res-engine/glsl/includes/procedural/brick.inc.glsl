#include <constants>

/**
 * Returns a float representation of a brick texture,
 * where 0 represents the boundary of a brick and 1 represents its center.
 * @param uv - inputted uv coordinates - by default, bricks have a width and height of 1.
 * @param offset - u offset for bricks in successive rows
 * @param aspectRatio - ratio of brick width to height - larger numbers = wider bricks.
 * @param center - unique vec2 identifying the center of this brick
 * @returns a local texcoord mapping for each brick.
 */
vec2 brickTexture(in vec2 uv, in float offset, in float aspectRatio, out vec2 center) {
  vec2 uvRatio = uv * vec2(1.0 / aspectRatio, 1.0);
  float offsetFactor = floor(uv.y);
  uvRatio.x += offset * offsetFactor;
  vec2 brickTex = fract(uvRatio);
  center = floor(uvRatio) + vec2(0.5);

  return brickTex;
}

// compile time is rough

vec2 getBrickCoordinates(in vec2 uv, in float scale, in float offset, in float aspectRatio, out vec2 center) {
  vec2 uvScale = uv * scale;
  vec2 uvRatio = (uvScale * vec2(1.0 / aspectRatio, 1.0));
  float offsetFactor = floor(uvScale.y);
  uvRatio.x += offset * offsetFactor;
  vec2 brickTex = fract(uvRatio);
  center = floor(uvRatio) + vec2(0.5);

  return brickTex;
}

float getHeightmapFromBrickCoordinates(in vec2 brickTextureSpace, in float aspectRatio, in float mortarSize, in float borderRadius) {
  vec2 distCoords = abs(brickTextureSpace - vec2(0.5));
  distCoords.x = 0.5 - ((0.5 - distCoords.x) * aspectRatio);
  vec2 radiusSample = vec2(0.5 - borderRadius - mortarSize);
  float brickHeight = max(0.0, max(distCoords.x, distCoords.y) - 0.5 + mortarSize);
  float brickFac = smoothstep(0.0, 1.0, brickHeight / mortarSize);
  vec2 borderDist = distCoords - radiusSample;
  if (borderDist.x > 0.0 && borderDist.y > 0.0) {
    brickHeight = max(brickHeight, length(borderDist) - borderRadius);
  }

  // account for border radius and mortar size
  // max value is (sqrt2 - 1) * borderRadius + mortarsize
  brickHeight = brickHeight / (mortarSize);

  // allow values to go below 0...
  // but we want to ensure continuity at the corners
  // we ought to approach a "maximum distance" established as sqrt2 * (border radius + mortarsize)
  // as we approach the border, we smoothstep towards that value, we de-emph the true distance

  return 1.0 - brickHeight;
}

void brickTexture(in vec2 uv,            in float scale,             in float offset, in float mortarSize, in float aspectRatio, in float borderRadius,
                  out float brickHeight, out vec2 brickTextureSpace, out vec2 centerPoint) {
  vec2 brickTex = getBrickCoordinates(uv, scale, offset, aspectRatio, centerPoint);
  brickHeight = getHeightmapFromBrickCoordinates(brickTex, aspectRatio, mortarSize, borderRadius);
  brickTextureSpace = brickTex;
}