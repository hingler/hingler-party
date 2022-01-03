
/**
 * Returns a float representation of a brick texture,
 * where 0 represents the boundary of a brick and 1 represents its center.
 * @param uv - inputted uv coordinates - by default, bricks have a width and height of 1.
 * @param offset - u offset for bricks in successive rows
 * @param aspectRatio - ratio of brick width to height - larger numbers = wider bricks.
 * @param center - unique vec2 identifying the center of this brick
 * @returns a local texcoord mapping for each brick.
 */
vec2 brickTexture(in vec2 uv, in float offset, in float aspectRatio, inout vec2 center) {
  // inv divide is costly?
  vec2 uvRatio = uv * vec2(1.0 / aspectRatio, 1.0);
  float offsetFactor = floor(uv.y);
  uvRatio.x += offset * offsetFactor;
  vec2 brickTex = fract(uvRatio);
  center = floor(uvRatio) + vec2(0.5);

  return brickTex;
}