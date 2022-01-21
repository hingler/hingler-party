/**
 * Passed to components on draw.
 * Contains information on the scene in general.
 */

import { Cubemap } from "../gl/Cubemap";
import { Framebuffer } from "../gl/Framebuffer";
import { ColorTexture } from "../gl/internal/ColorTexture";
import { FloatColorTexture } from "../gl/internal/FloatColorTexture";
import { AmbientLightStruct } from "../gl/struct/AmbientLightStruct";
import { SpotLightStruct } from "../gl/struct/SpotLightStruct";
import { Texture } from "../gl/Texture";
import { CameraInfo } from "../object/game/Camera";

/**
 * Identifies which render pass we should run.
 */
export enum RenderPass {
  SHADOW,
  FINAL
}

export interface SkyboxInfo {
  irridance: Cubemap,
  specular: Cubemap,
  brdf: FloatColorTexture,
  color: Cubemap,
  intensity: number;
};

export interface RenderContext {
  // provide information on which pass is being drawn
  getRenderPass() : RenderPass;

  // returns information regarding the currently active camera
  getActiveCameraInfo() : CameraInfo;

  // returns a list of spot lights associated with this render
  getSpotLightInfo() : Array<SpotLightStruct>;

  getAmbientLightInfo() : Array<AmbientLightStruct>; 

  getSkybox() : Array<SkyboxInfo>;

  getFramebuffer() : Framebuffer;

  // returns a texture containing position data for the entire scene
  getPositionData() : Texture;
};