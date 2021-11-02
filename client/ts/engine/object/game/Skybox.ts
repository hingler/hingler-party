import {GameContext} from "../../GameContext";
import {GameObject} from "./GameObject";

// todo2: cubemap wrapper?
// representation of a simple skybox :D
export class Skybox extends GameObject {
  // ctor with several images, or...
  // just a single cubemap?
  //
  // we'll accept and HDR and convert it to a cubemap,
  // then generating the IBL cubemaps from that
  // we'll search our tree for the first cubemap we find and use that
  //
  // todo: resolving multiple cubemaps?
  constructor(ctx: GameContext, path: string) {
    super(ctx);
  }
}
