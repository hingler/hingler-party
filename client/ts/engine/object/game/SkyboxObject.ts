import { vec3 } from "gl-matrix";
import {GameContext} from "../../GameContext";
import { ColorCubemap } from "../../gl/ColorCubemap";
import { DepthStencilRenderbuffer } from "../../gl/internal/DepthStencilRenderbuffer";
import { FloatColorTexture } from "../../gl/internal/FloatColorTexture";
import { GLAttributeImpl } from "../../gl/internal/GLAttributeImpl";
import { DataType } from "../../gl/internal/GLBuffer";
import { GLBufferImpl } from "../../gl/internal/GLBufferImpl";
import { GLIndexImpl } from "../../gl/internal/GLIndexImpl";
import { HDRTexture } from "../../gl/internal/HDRTexture";
import { SkyboxFramebuffer } from "../../gl/internal/SkyboxFramebuffer";
import { ModelImpl, ModelInstance } from "../../loaders/internal/ModelImpl";
import { BRDFLutDisplay } from "../../material/internal/BRDFLutDisplay";
import { CubemapCoords } from "../../material/internal/CubemapCoords";
import { CubemapToDiffuseIBLDisplay } from "../../material/internal/CubemapToDiffuseIBLDisplay";
import { CubemapToSpecularIBLDisplay } from "../../material/internal/CubemapToSpecularIBLDisplay";
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
  private cubemap: ColorCubemap;
  private cubemapDiffuse: ColorCubemap;
  private cubemapSpecular: ColorCubemap;
  private iblBRDF: FloatColorTexture;
  private model: Model;
  private mat: SkyboxMaterial;

  private extMipmapRender: boolean;
  private extLodTexture: boolean;

  // how can we tell the engine that we're rendering our skybox?
  // add skybox construction as a context feature so we can pass in an engine context
  // use the engine context to notify client that we're compiling a skybox
  constructor(ctx: GameContext, path: string) {
    super(ctx);
    this.hdr = new HDRTexture(ctx, path);
    this.mat = new SkyboxMaterial(ctx);

    this.extLodTexture =    !!(ctx.getGLExtension("EXT_shader_texture_lod"));
    this.extMipmapRender =  !!(ctx.getGLExtension("OES_fbo_render_mipmap"));
    
    this.hdrProg = new HDRToCubemapDisplay(ctx, this.hdr);
    this.cubemap = null;
    this.cubemapDiffuse = null;
    this.cubemapSpecular = null;
    this.iblBRDF = null;

    this.model = SkyboxObject.createSkyboxCube(ctx.getGLContext());

    const hdrPromise = this.hdr.waitUntilUploaded(); 
    hdrPromise.then(this.prepareSkybox.bind(this));
  }

  getCubemap() {
    return this.cubemap;
  }

  getCubemapDiffuse() {
    return this.cubemapDiffuse;
  }

  getCubemapSpecular() {
    // uh oh!!! funky business :)
    // i'll figure it out later :nerd:
    return this.cubemapSpecular;
  }

  getBRDF() {
    return this.iblBRDF;
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
      indexBuf.setUint16(offset, indexFaces[i + 2], true);
      offset += 2;
      indexBuf.setUint16(offset, indexFaces[i + 1], true);
      offset += 2;
      indexBuf.setUint16(offset, indexFaces[i], true);
      offset += 2;
      indexBuf.setUint16(offset, indexFaces[i + 1], true);
      offset += 2;
      indexBuf.setUint16(offset, indexFaces[i + 2], true);
      offset += 2;
      indexBuf.setUint16(offset, indexFaces[i + 3], true);
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
    const dim = this.hdr.dims.reduce((prev, cur) => Math.min(prev, cur));
    const cubeBuffer = new SkyboxFramebuffer(this.getContext(), dim);
    const diffuseBuffer = new SkyboxFramebuffer(this.getContext(), 32);
    const specBuffer = new SkyboxFramebuffer(this.getContext(), dim / 2);
    await this.hdrProg.getShaderFuture().wait();
    await this.renderSkybox(cubeBuffer, diffuseBuffer, specBuffer);
  }

  private configureCubemapCoords(i: number, mat: CubemapCoords) {
    mat.center[0] = 0;
    mat.center[1] = 0;
    mat.center[2] = 0;

    mat.center[Math.floor(i / 2)] = (1 - (i % 2)) * 2 - 1;

    // right:  [0, 0, 1], [0, 0, -1], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [1, 0, 0]
    mat.right[0] = (i < 2 ? 0 : (i === 5 ? 1 : -1));
    mat.right[2] = (i < 2 ? (1 - (i % 2)) * 2 - 1 : 0);
    // up:     [0, 1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [0, 1, 0], [0, 1, 0]
    mat.up[2] = (i === 2 || i === 3 ? (i % 2) * 2 - 1 : 0);
    mat.up[1] = (i === 2 || i === 3 ? 0 : 1);

  }

  private async renderSkybox(cubeBuffer: SkyboxFramebuffer, diffuseBuffer: SkyboxFramebuffer, specBuffer: SkyboxFramebuffer) {
    // draw our HDR onto each side of the texture
    // use some SkyboxDisplay function to blast our HDR onto the side of the cubemap
    const gl = this.getContext().getGLContext();
    this.hdrProg.center = vec3.create();
    this.hdrProg.right = vec3.create();
    this.hdrProg.up = vec3.create();
    // cubeBuffer.setMipLevel(0);
    for (let i = 0; i < 6; i++) {
      cubeBuffer.bindFramebuffer(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i);
      gl.viewport(0, 0, cubeBuffer.dim, cubeBuffer.dim);

      this.configureCubemapCoords(i, this.hdrProg);
      this.hdrProg.drawTexture();
    }

    this.cubemap = cubeBuffer.getCubemap();
    this.cubemap.generateMipmaps();

    // for now: if we can't render to a mipmap, ignore it!
    if (this.extMipmapRender) {
      const diffuseMat = new CubemapToDiffuseIBLDisplay(this.getContext(), this.cubemap);
      await diffuseMat.waitUntilCompiled();
  
      // render diffuse buffer
      for (let i = 0; i < 6; i++) {
        diffuseBuffer.bindFramebuffer(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i);
        gl.viewport(0, 0, diffuseBuffer.dim, diffuseBuffer.dim);
  
        this.configureCubemapCoords(i, diffuseMat);
        diffuseMat.draw();
      }
  
      this.cubemapDiffuse = diffuseBuffer.getCubemap();
      this.cubemapDiffuse.generateMipmaps();
  
      await this.renderSpecularIBL(this.cubemap, specBuffer);
    }
  }

  private async renderSpecularIBL(cube: ColorCubemap, specBuffer: SkyboxFramebuffer) {
    const gl = this.getContext().getGLContext();
    const specMat = new CubemapToSpecularIBLDisplay(this.getContext(), this.cubemap);
    await specMat.waitUntilCompiled();

    specMat.cubemapRes = cube.dims;
    
    const mipLevels = 5;
    let dim = specBuffer.dim;
    for (let i = 0; i < 5; i++) {
      specMat.destRes = specBuffer.dim;
      specMat.roughness = i / (mipLevels - 1);
      specBuffer.setMipLevel(i);
      gl.viewport(0, 0, specBuffer.dim, specBuffer.dim);
      for (let j = 0; j < 6; j++) {
        // note: if fb mipmap draw isnt supported: these will have to be separate textures
        // managing it inside this cubemap fb isnt too bad
        // binding it might be

        // implementer will need some way to see each mipmap level and bind them individually
        // we can use skyboxinfo for this
        // add some faculty for checking how our textures are bound
        // put into the skybox info struct accordingly
        // single texture, or 5 (per roughness)

        // wrap all of those textures in a single "skyboxinfo" struct and then have the mat accept it
        // mat will figure out how to bind it based on compilation options
        specBuffer.bindFramebuffer(gl.TEXTURE_CUBE_MAP_POSITIVE_X + j);
        this.configureCubemapCoords(j, specMat);
        specMat.draw();
      }
    }

    // if this is avail: we can use cubelod to fetch
    // if not: we have to create several textures, and render to each one!
    this.cubemapSpecular = specBuffer.getCubemap();

    await this.createBRDF();
  }

  private async createBRDF() {
    const gl = this.getContext().getGLContext();
    const mat = new BRDFLutDisplay(this.getContext());
    await mat.waitUntilCompiled();
    const tex = new FloatColorTexture(this.getContext(), [512, 512]);
    const fb = gl.createFramebuffer();
    const rb = new DepthStencilRenderbuffer(this.getContext(), [512, 512]);
    rb.attachToFramebuffer(fb);
    tex.attachToFramebuffer(fb, gl.COLOR_ATTACHMENT0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    mat.draw();

    this.iblBRDF = tex;
  }

  renderMaterial(rc: RenderContext) {
    if (this.cubemap !== null) {
      const gl = this.getContext().getGLContext();
      gl.disable(gl.CULL_FACE);
      const cam = rc.getActiveCameraInfo();
      this.mat.persp = cam.perspectiveMatrix;
      this.mat.view = cam.viewMatrix;
      this.mat.cube = this.cubemap;
      this.mat.drawMaterial(this.model);
      gl.enable(gl.CULL_FACE);
    }
  }
}
