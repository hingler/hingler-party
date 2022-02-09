import { GameContext } from "../GameContext";
import { screenCoords } from "./TextureDisplay";

/**
 * Quick function to generate a full screen quad buffer object
 * @param ctx - context
 * @returns a WebGLBuffer with unindexed vertex data
 */
export function getFullScreenQuadBuffer(ctx: GameContext) {
  const gl = ctx.getGLContext();
  const buf = gl.createBuffer();
  const wrap = ctx.getGL();
  wrap.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, screenCoords, gl.STATIC_DRAW);
  return buf;
}