import { vec3 } from "gl-matrix";
import {GameContext} from "../../GameContext";
import { Cubemap } from "../../gl/Cubemap";
import { Framebuffer } from "../../gl/Framebuffer";
import { ColorFramebuffer } from "../../gl/internal/ColorFramebuffer";
import { GLAttributeImpl } from "../../gl/internal/GLAttributeImpl";
import { DataType } from "../../gl/internal/GLBuffer";
import { GLBufferImpl } from "../../gl/internal/GLBufferImpl";
import { GLIndexImpl } from "../../gl/internal/GLIndexImpl";
import { HDRTexture } from "../../gl/internal/HDRTexture";
import { SkyboxFramebuffer } from "../../gl/internal/SkyboxFramebuffer";
import { ModelImpl, ModelInstance } from "../../loaders/internal/ModelImpl";
import { HDRToCubemapDisplay } from "../../material/internal/HDRToCubemapDisplay";
import { SkyboxMaterial } from "../../material/SkyboxMaterial";
import { Model } from "../../model/Model";
import { RenderContext } from "../../render/RenderContext";
import {GameObject} from "./GameObject";

// todo2: cubemap wrapper?
// representation of a simple skybox :D
export class SkyboxObject extends GameObject {
  private hdr: HDRTexture;
  private hdrProg: HDRToCubemapDisplay;
  private cubemap: Cubemap;
  private model: Model;
  private mat: SkyboxMaterial;

  constructor(ctx: GameContext, path: string) {
    super(ctx);
    this.hdr = new HDRTexture(ctx, path);
    this.mat = new SkyboxMaterial(ctx);

    
    // can't know size of cubemap until hdrpromise is done
    
    this.hdrProg = new HDRToCubemapDisplay(ctx, this.hdr);
    this.cubemap = null;

    this.model = SkyboxObject.createSkyboxCube(ctx.getGLContext());

    const hdrPromise = this.hdr.waitUntilUploaded(); 
    hdrPromise.then(this.prepareSkybox.bind(this));
  }

  private static createSkyboxCube(gl: WebGLRenderingContext) {
    const vertexBuf = new GLBufferImpl(gl);
    const indexBuf = new GLBufferImpl(gl);
    for (let i = 0; i < 8; i++) {
      vertexBuf.setFloatArray(i * 12, [(i & 1 ? 1 : -1), (i & 2 ? 1 : -1), (i & 4 ? 1 : -1)]);
    }

    const indexFaces = [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 4, 5, 2, 3, 6, 7, 0, 2, 4, 6, 1, 3, 5, 7];
    let offset = 0;
    for (let i = 0; i < indexFaces.length; i += 4) {
      indexBuf.setUint16(offset, indexFaces[i], true);
      offset += 2;
      indexBuf.setUint16(offset, indexFaces[i + 1], true);
      offset += 2;
      indexBuf.setUint16(offset, indexFaces[i + 2], true);
      offset += 2;
      indexBuf.setUint16(offset, indexFaces[i + 3], true);
      offset += 2;
      indexBuf.setUint16(offset, indexFaces[i + 2], true);
      offset += 2;
      indexBuf.setUint16(offset, indexFaces[i + 1], true);
      offset += 2;
    }

    const vertAttrib = GLAttributeImpl.createFromValues(vertexBuf, 3, gl.FLOAT, 24, 0, 0);

    const index = GLIndexImpl.createFromValues(indexBuf, DataType.UNSIGNED_SHORT, Math.round(indexFaces.length * 1.5), 0);

    const inst : ModelInstance = {
      positions: vertAttrib,
      indices: index
    };

    return new ModelImpl([inst]);
  }

  private async prepareSkybox() {
    const dim = this.hdr.dims.reduce((prev, cur) => Math.min(prev, cur)) / 2;
    const cubeBuffer = new SkyboxFramebuffer(this.getContext(), dim);
    await this.hdrProg.getShaderFuture().wait();
    this.renderSkybox(cubeBuffer);
  }

  private renderSkybox(cubeBuffer: SkyboxFramebuffer) {
    // draw our HDR onto each side of the texture
    // use some SkyboxDisplay function to blast our HDR onto the side of the cubemap
    const gl = this.getContext().getGLContext();
    this.hdrProg.center = vec3.create();
    this.hdrProg.right = vec3.create();
    this.hdrProg.up = vec3.create();
    for (let i = 0; i < 6; i++) {
      cubeBuffer.bindFramebuffer(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i);
      gl.viewport(0, 0, cubeBuffer.dim, cubeBuffer.dim);

      // handling directions :(
      // center: [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
      this.hdrProg.center[0] = 0;
      this.hdrProg.center[1] = 0;
      this.hdrProg.center[2] = 0;

      this.hdrProg.center[Math.floor(i / 2)] = (1 - (i % 2)) * 2 - 1;

      // right:  [0, 0, 1], [0, 0, -1], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [1, 0, 0]
      this.hdrProg.right[0] = (i < 2 ? 0 : (i === 5 ? 1 : -1));
      this.hdrProg.right[2] = (i < 2 ? (1 - (i % 2)) * 2 - 1 : 0);
      // up:     [0, 1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [0, 1, 0], [0, 1, 0]
      this.hdrProg.up[2] = (i === 2 || i === 3 ? (i % 2) * 2 - 1 : 0);
      this.hdrProg.up[1] = (i === 2 || i === 3 ? 0 : 1);

      console.log(this.hdrProg.center);
      console.log(this.hdrProg.right);
      console.log(this.hdrProg.up);
      this.hdrProg.drawTexture();
    }

    this.cubemap = cubeBuffer.getCubemap();
  }

  renderMaterial(rc: RenderContext) {
    if (this.cubemap !== null) {
      const cam = rc.getActiveCameraInfo();
      this.mat.persp = cam.perspectiveMatrix;
      this.mat.view = cam.viewMatrix;
      this.mat.cube = this.cubemap;
      this.mat.drawMaterial(this.model);
    }
  }
}
