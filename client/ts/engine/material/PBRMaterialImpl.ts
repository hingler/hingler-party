// todo: replace instances of WebGLProgram with a version which keeps track of uniform locations

import { mat3, mat4, vec3, vec4 } from "gl-matrix";
import { GameContext } from "../GameContext";
import { ColorCubemap } from "../gl/ColorCubemap";
import { Cubemap } from "../gl/Cubemap";
import { GLBuffer, GLBufferReadOnly } from "../gl/internal/GLBuffer";
import { GLBufferImpl } from "../gl/internal/GLBufferImpl";
import { GLProgramWrap } from "../gl/internal/GLProgramWrap";
import { ShaderProgramBuilder } from "../gl/ShaderProgramBuilder";
import { AmbientLightStruct } from "../gl/struct/AmbientLightStruct";
import { SpotLightStruct } from "../gl/struct/SpotLightStruct";
import { Texture } from "../gl/Texture";
import { getEnginePath } from "../internal/getEnginePath";
import { InstancedModel } from "../model/InstancedModel";
import { AttributeType, Model } from "../model/Model";
import { RenderContext } from "../render/RenderContext";
import { CalculateNormalMatrixFromBuffer } from "./CalculateNormalMatrixFromBuffer";
import { Material } from "./Material";
import { PBRInstancedMaterial } from "./PBRInstancedMaterial";
import { PBRMaterial } from "./PBRMaterial";
import { TextureDummy } from "./TextureDummy";

interface SpotLightUniform {
  position: WebGLUniformLocation;
  direction: WebGLUniformLocation;
  fov: WebGLUniformLocation;
  falloff: WebGLUniformLocation;
  intensity: WebGLUniformLocation;
  color: WebGLUniformLocation;
  transform: WebGLUniformLocation;
  shadowSize: WebGLUniformLocation;
  shadowtex: WebGLUniformLocation;

  atten_const: WebGLUniformLocation;
  atten_linear: WebGLUniformLocation;
  atten_quad: WebGLUniformLocation;
}

// todo: merge this and instanced?
// create a single unified material which supports instancing
export class PBRMaterialImpl implements Material, PBRMaterial, PBRInstancedMaterial { 
  private progWrap: GLProgramWrap;
  private prog: WebGLProgram; 
  private ctx: GameContext;
  private spot: Array<SpotLightStruct>;
  private amb: Array<AmbientLightStruct>;
  private placeholder: TextureDummy;

  private modelMatrixIndex: number;
  private normalBuffer: GLBufferImpl;

  private spotLightUniforms: Array<SpotLightUniform>;
  private spotLightUniformsNoShadow: Array<SpotLightUniform>;

  private placeholderCube: Cubemap;
   
  vpMat: mat4;
  modelMat: mat4;
  
  color: Texture;
  colorFactor: vec4;
  normal: Texture;
  metalRough: Texture;
  metalFactor: number;
  roughFactor: number;

  emission: Texture;
  emissionFactor: vec4;

  irridance: Cubemap;

  // use a flag to indicate whether the model matrix should be used as an attribute
  // probably use a step func to snag the right one

  cameraPos: vec3;

  private locs: {
    modelMat: WebGLUniformLocation,
    vpMat: WebGLUniformLocation,
    normalMat: WebGLUniformLocation,
    lightCount: WebGLUniformLocation,
    lightCountNoShadow: WebGLUniformLocation,
    ambientCount: WebGLUniformLocation,
    cameraPos: WebGLUniformLocation,

    texAlbedo: WebGLUniformLocation,
    texNorm: WebGLUniformLocation,
    texMetalRough: WebGLUniformLocation,
    texEmission: WebGLUniformLocation,

    useAlbedo: WebGLUniformLocation,
    useNorm: WebGLUniformLocation,
    useRough: WebGLUniformLocation,
    useEmission: WebGLUniformLocation,

    albedoDef: WebGLUniformLocation,
    roughDef: WebGLUniformLocation,
    metalDef: WebGLUniformLocation,
    emissionFactor: WebGLUniformLocation,

    useAttribute: WebGLUniformLocation,
    irridance: WebGLUniformLocation,
    useIrridance: WebGLUniformLocation
  };

  private attribs: {
    pos: number,
    norm: number,
    tex: number,
    tan: number,
    modelMat: number,
    normMat: number
  };

  constructor(ctx: GameContext) {
    this.ctx = ctx;
    this.prog = null;

    this.placeholder = new TextureDummy(ctx);

    this.vpMat = mat4.create();
    this.modelMat = mat4.create();
    this.normal = null;
    this.color = null;
    this.irridance = null;
    this.colorFactor = vec4.create();
    this.metalRough = null;
    this.metalFactor = 1.0;
    this.roughFactor = 1.0;
    this.emissionFactor = vec4.create();
    this.emission = null;
    this.placeholderCube = new ColorCubemap(ctx, 8);
    vec4.zero(this.emissionFactor);

    this.spotLightUniforms = [];
    this.spotLightUniformsNoShadow = [];

    this.cameraPos = vec3.create();

    this.modelMatrixIndex = -1;
    let gl = ctx.getGLContext();
    this.normalBuffer = new GLBufferImpl(gl, undefined, gl.DYNAMIC_DRAW);

    mat4.identity(this.vpMat);
    mat4.identity(this.modelMat);

    new ShaderProgramBuilder(ctx)
      .withVertexShader(getEnginePath("engine/glsl/pbr/pbr.vert"))
      .withFragmentShader(getEnginePath("engine/glsl/pbr/pbr.frag"))
      .build()
      .then(this.configureProgram.bind(this))
      .catch(console.error.bind(console));
  }

  private configureProgram(prog: WebGLProgram) {
    this.prog = prog;
    let gl = this.ctx.getGLContext();

    this.locs = {
      modelMat: gl.getUniformLocation(prog, "model_matrix"),
      vpMat: gl.getUniformLocation(prog, "vp_matrix"),
      normalMat: gl.getUniformLocation(prog, "normal_matrix"),
      lightCount: gl.getUniformLocation(prog, "spotlightCount"),
      lightCountNoShadow: gl.getUniformLocation(prog, "spotlightCount_no_shadow"),
      ambientCount: gl.getUniformLocation(prog, "ambientCount"),
      cameraPos: gl.getUniformLocation(prog, "camera_pos"),
      texAlbedo: gl.getUniformLocation(prog, "tex_albedo"),
      texNorm: gl.getUniformLocation(prog, "tex_norm"),
      texMetalRough: gl.getUniformLocation(prog, "tex_metal_rough"),
      texEmission: gl.getUniformLocation(prog, "tex_emission"),
      useAlbedo: gl.getUniformLocation(prog, "use_albedo"),
      useNorm: gl.getUniformLocation(prog, "use_norm"),
      useRough: gl.getUniformLocation(prog, "use_metal_rough"),
      useEmission: gl.getUniformLocation(prog, "use_emission"),
      albedoDef: gl.getUniformLocation(prog, "color_factor"),
      roughDef: gl.getUniformLocation(prog, "rough_factor"),
      metalDef: gl.getUniformLocation(prog, "metal_factor"),
      emissionFactor: gl.getUniformLocation(prog, "emission_factor"),
      useAttribute: gl.getUniformLocation(prog, "is_instanced"),
      irridance: gl.getUniformLocation(prog, "irridance"),
      useIrridance: gl.getUniformLocation(prog, "useIrridance")
    };

    this.attribs = {
      pos: gl.getAttribLocation(prog, "position"),
      norm: gl.getAttribLocation(prog, "normal"),
      tex: gl.getAttribLocation(prog, "texcoord"),
      tan: gl.getAttribLocation(prog, "tangent"),
      modelMat: gl.getAttribLocation(prog, "a_model_matrix"),
      normMat: gl.getAttribLocation(prog, "a_normal_matrix")
    };

    this.progWrap = new GLProgramWrap(gl, this.prog);

    for (let i = 0; i < 8; i++) {
      let uni = {} as SpotLightUniform;
      const ext = (i % 2 === 1 ? "_no_shadow" : "");
      const flad = Math.floor(i / 2);
      uni.position = gl.getUniformLocation(prog, `spotlight${ext}[${flad}].position`);
      uni.direction = gl.getUniformLocation(prog, `spotlight${ext}[${flad}].dir`);
      uni.fov = gl.getUniformLocation(prog, `spotlight${ext}[${flad}].fov`);
      uni.falloff = gl.getUniformLocation(prog, `spotlight${ext}[${flad}].falloffRadius`);
      uni.intensity = gl.getUniformLocation(prog, `spotlight${ext}[${flad}].intensity`);
      uni.color = gl.getUniformLocation(prog, `spotlight${ext}[${flad}].color`);
      uni.transform = gl.getUniformLocation(prog, `spotlight${ext}[${flad}].lightTransform`);
      uni.shadowSize = gl.getUniformLocation(prog, `spotlight${ext}[${flad}].shadowSize`);
      if (i % 2 === 0) {
        uni.shadowtex = gl.getUniformLocation(prog, `texture_spotlight[${flad}]`);
      }

      uni.atten_const = gl.getUniformLocation(prog, `spotlight${ext}[${flad}].a.atten_const`);
      uni.atten_linear = gl.getUniformLocation(prog, `spotlight${ext}[${flad}].a.atten_linear`);
      uni.atten_quad = gl.getUniformLocation(prog, `spotlight${ext}[${flad}].a.atten_quad`);

      (i % 2 === 0 ? this.spotLightUniforms : this.spotLightUniformsNoShadow).push(uni);
    }
  }

  private bindSpotLightStruct(s: SpotLightStruct, loc: SpotLightUniform) {
    const gl = this.ctx.getGLContext();
    gl.uniform3fv(loc.position, s.position);
    gl.uniform3fv(loc.direction, s.dir);
    gl.uniform1f(loc.fov, s.fov);
    gl.uniform1f(loc.falloff, s.falloffRadius);
    gl.uniform1f(loc.intensity, s.intensity);
    gl.uniform4fv(loc.color, s.color);

    if (s.hasShadow()) {
      s.shadowTex.bindToUniform(loc.shadowtex, s.getShadowTextureIndex());
    }

    gl.uniformMatrix4fv(loc.transform, false, s.lightTransform);
    gl.uniform2fv(loc.shadowSize, s.shadowSize);

    gl.uniform1f(loc.atten_const, s.attenuation.atten_const);
    gl.uniform1f(loc.atten_linear, s.attenuation.atten_linear);
    gl.uniform1f(loc.atten_quad, s.attenuation.atten_quad);
  }

  setSpotLight(light: Array<SpotLightStruct>) {
    this.spot = light;
  }

  setAmbientLight(light: Array<AmbientLightStruct>) {
    this.amb = light;
  }

  setModelMatrixIndex(index: number) {
    this.modelMatrixIndex = index;
  }

  private calculateNormalMatrixFromBuffer(buf: GLBufferReadOnly, instances: number) {
    CalculateNormalMatrixFromBuffer(buf, this.normalBuffer, instances, 0, 0);
  }

  prepareAttributes(model: InstancedModel, instances: number, rc: RenderContext) {
    let gl = this.ctx.getGLContext();
    if (this.prog === null) {
      const err = "Program is not yet compiled -- cannot bind attributes";
      throw Error(err);
    }

    // there's some setup that happens here which breaks the shadow renderer, when the prog fails
    // to compile the shadow view looks just fine so i will have to investigate further :(
    if (this.prog !== null) {
      gl.useProgram(this.prog);

      this.setSpotLight(rc.getSpotLightInfo());
      this.setAmbientLight(rc.getAmbientLightInfo());

      let info = rc.getActiveCameraInfo(); 
      gl.uniformMatrix4fv(this.locs.vpMat, false, info.vpMatrix);

      let shadowSpot = 0;
      let noShadowSpot = 0;
      if (this.spot) {
        for (let i = 0; i < this.spot.length; i++) {
          if (this.spot[i].hasShadow() && shadowSpot < 3) {
            this.spot[i].setShadowTextureIndex(shadowSpot + 4);
            this.bindSpotLightStruct(this.spot[i], this.spotLightUniforms[shadowSpot]);
            shadowSpot++;
          } else {
            this.bindSpotLightStruct(this.spot[i], this.spotLightUniformsNoShadow[noShadowSpot]);
            noShadowSpot++;
          }
        }
      }

      gl.uniform1i(this.locs.lightCount, shadowSpot);
      gl.uniform1i(this.locs.lightCountNoShadow, noShadowSpot);

      if (this.amb) {
        for (let i = 0; i < this.amb.length && i < 4; i++) {
          this.amb[i].bindToUniformByName(this.progWrap, `ambient[${i}]`);
        }

        gl.uniform1i(this.locs.ambientCount, this.amb.length);
      } else {
        gl.uniform1i(this.locs.ambientCount, 0);
      }


      gl.uniform3fv(this.locs.cameraPos, info.cameraPosition);

      if (this.color === null) {
        this.placeholder.bindToUniform(this.locs.texAlbedo, 0);
        gl.uniform1i(this.locs.useAlbedo, 0);
      } else {  // this.color instanceof Texture*
        this.color.bindToUniform(this.locs.texAlbedo, 0);
        gl.uniform1i(this.locs.useAlbedo, 1);
      }
      
      gl.uniform4fv(this.locs.albedoDef, this.colorFactor);

      gl.uniform1i(this.locs.useAttribute, 1);

      if (this.normal === null) {
        this.placeholder.bindToUniform(this.locs.texNorm, 1);
        gl.uniform1i(this.locs.useNorm, 0);
      } else {
        this.normal.bindToUniform(this.locs.texNorm, 1);
        gl.uniform1i(this.locs.useNorm, 1);
      }

      if (this.metalRough === null) {
        this.placeholder.bindToUniform(this.locs.texMetalRough, 2);
        gl.uniform1i(this.locs.useRough, 0);
      } else {
        this.metalRough.bindToUniform(this.locs.texMetalRough, 2);
        gl.uniform1i(this.locs.useRough, 1);
      }

      if (this.emission === null) {
        this.placeholder.bindToUniform(this.locs.texEmission, 3);
        gl.uniform1i(this.locs.useEmission, 0);
      } else {
        this.emission.bindToUniform(this.locs.texEmission, 3);
        gl.uniform1i(this.locs.useEmission, 1);
      }
      
      gl.uniform1f(this.locs.roughDef, this.roughFactor);
      gl.uniform1f(this.locs.metalDef, this.metalFactor);
      gl.uniform4fv(this.locs.emissionFactor, this.emissionFactor);

      const skybox = rc.getSkybox();
      if (skybox !== null) {
        skybox.irridance.bindToUniform(this.locs.irridance, 8);
        gl.uniform1i(this.locs.useIrridance, 1);
      } else {
        this.placeholderCube.bindToUniform(this.locs.irridance, 8);
        gl.uniform1i(this.locs.useIrridance, 0);
      }

      model.bindAttribute(AttributeType.POSITION, this.attribs.pos);
      model.bindAttribute(AttributeType.NORMAL, this.attribs.norm);
      model.bindAttribute(AttributeType.TEXCOORD, this.attribs.tex);
      model.bindAttribute(AttributeType.TANGENT, this.attribs.tan);

      for (let i = 0; i < 4; i++) {
        let loc = this.attribs.modelMat + i;
        let byteOffset = i * 16;
        model.instanceAttribPointer(this.modelMatrixIndex, loc, 4, gl.FLOAT, false, 64, byteOffset);
      }

      let modelmats = model.getReadOnlyBuffer(this.modelMatrixIndex);
      this.calculateNormalMatrixFromBuffer(modelmats, instances);
      for (let i = 0; i < 3; i++) {
        let loc = this.attribs.normMat + i;
        let byteOffset = i * 12;
        this.normalBuffer.bindToInstancedVertexAttribute(loc, 3, gl.FLOAT, false, 36, byteOffset);
      }
    }
  }

  cleanUpAttributes() {
    for (let i = 0; i < 3; i++) {
      this.normalBuffer.disableInstancedVertexAttribute(this.attribs.normMat + i);
    }
  }

  drawMaterial(model: Model) {
    let gl = this.ctx.getGLContext();
    if (this.prog !== null) {
      gl.useProgram(this.prog);

      let normalMat = mat3.create();
      normalMat = mat3.fromMat4(normalMat, this.modelMat);
      normalMat = mat3.transpose(normalMat, normalMat);
      normalMat = mat3.invert(normalMat, normalMat);

      gl.uniformMatrix4fv(this.locs.modelMat, false, this.modelMat);
      gl.uniformMatrix4fv(this.locs.vpMat, false, this.vpMat);
      gl.uniformMatrix3fv(this.locs.normalMat, false, normalMat);

      let shadowSpot = 0;
      let noShadowSpot = 0;
      if (this.spot) {
        for (let i = 0; i < this.spot.length; i++) {
          if (this.spot[i].hasShadow() && shadowSpot < 3) {
            this.spot[i].setShadowTextureIndex(shadowSpot + 4);
            this.bindSpotLightStruct(this.spot[i], this.spotLightUniforms[shadowSpot]);
            shadowSpot++;
          } else {
            this.bindSpotLightStruct(this.spot[i], this.spotLightUniformsNoShadow[noShadowSpot]);
            noShadowSpot++;
          }
        }
      }

      gl.uniform1i(this.locs.lightCount, shadowSpot);
      gl.uniform1i(this.locs.lightCountNoShadow, noShadowSpot);
      gl.uniform3fv(this.locs.cameraPos, this.cameraPos);

      if (this.color === null) {
        this.placeholder.bindToUniform(this.locs.texAlbedo, 0);
        gl.uniform1i(this.locs.useAlbedo, 0);
      } else {  // this.color instanceof Texture*
        this.color.bindToUniform(this.locs.texAlbedo, 0);
        gl.uniform1i(this.locs.useAlbedo, 1);
      }
      
      gl.uniform4fv(this.locs.albedoDef, this.colorFactor);

      if (this.normal === null) {
        this.placeholder.bindToUniform(this.locs.texNorm, 1);
        gl.uniform1i(this.locs.useNorm, 0);
      } else {
        this.normal.bindToUniform(this.locs.texNorm, 1);
        gl.uniform1i(this.locs.useNorm, 1);
      }

      if (this.metalRough === null) {
        this.placeholder.bindToUniform(this.locs.texMetalRough, 2);
        gl.uniform1i(this.locs.useRough, 0);
      } else {
        this.metalRough.bindToUniform(this.locs.texMetalRough, 2);
        gl.uniform1i(this.locs.useRough, 1);
      }
      
      gl.uniform1f(this.locs.roughDef, this.roughFactor);
      gl.uniform1f(this.locs.metalDef, this.metalFactor);

      gl.uniform4fv(this.locs.emissionFactor, this.emissionFactor);

      gl.uniform1i(this.locs.useAttribute, 0);

      if (this.irridance !== null) {
        this.irridance.bindToUniform(this.locs.irridance, 8);
        gl.uniform1i(this.locs.useIrridance, 1);
      } else {
        this.placeholderCube.bindToUniform(this.locs.irridance, 8);
        gl.uniform1i(this.locs.useIrridance, 0);
      }

      model.bindAttribute(AttributeType.POSITION, this.attribs.pos);
      model.bindAttribute(AttributeType.NORMAL, this.attribs.norm);
      model.bindAttribute(AttributeType.TEXCOORD, this.attribs.tex);
      model.bindAttribute(AttributeType.TANGENT, this.attribs.tan);

      model.draw();
    }
  }
}