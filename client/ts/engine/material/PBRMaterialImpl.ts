// todo: replace instances of WebGLProgram with a version which keeps track of uniform locations

import { mat3, mat4, ReadonlyMat4, ReadonlyVec4, vec3, vec4 } from "gl-matrix";
import { AttributeType } from "nekogirl-valhalla/model/AttributeType";
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
import { RenderType } from "../internal/performanceanalytics";
import { InstancedModel } from "../model/InstancedModel";
import { Model } from "../model/Model";
import { RenderContext, RenderPass, SkyboxInfo } from "../render/RenderContext";
import { CalculateNormalMatrixFromBuffer } from "./CalculateNormalMatrixFromBuffer";
import { Material } from "./Material";
import { PBRInstancedMaterial } from "./PBRInstancedMaterial";
import { PBRInterface } from "./PBRInterface";
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
export class PBRMaterialImpl implements Material, PBRMaterial, PBRInstancedMaterial, PBRInterface { 
  // statics are a bit iffy but :(
  private static progWrap: GLProgramWrap = null;
  private static prog: WebGLProgram = null;
  private static progLoading: boolean = false;

  private ctx: GameContext;
  private spot: Array<SpotLightStruct>;
  private amb: Array<AmbientLightStruct>;
  private placeholder: TextureDummy;
  private placeholderNorm: TextureDummy;
  private placeholderARM: TextureDummy;
  private placeholderEmission: TextureDummy;
  private placeholderParallax: TextureDummy;

  private spotPlaceholders: Array<TextureDummy>;

  private modelMatrixIndex: number;
  private normalBuffer: GLBufferImpl;

  private static spotLightUniforms: Array<SpotLightUniform>;
  private static spotLightUniformsNoShadow: Array<SpotLightUniform>;

  private placeholderCube: Cubemap;
  private placeholderCubeSpec: Cubemap;
  private placeholderBRDF: Texture;

  private placeholderCubeSub: Cubemap;
  private placeholderCubeSpecSub: Cubemap;

  private skyboxes: Array<SkyboxInfo>;
   
  vpMat: ReadonlyMat4;
  modelMat: ReadonlyMat4;
  
  color: Texture;
  colorFactor: ReadonlyVec4;
  normal: Texture;
  metalRough: Texture;

  heightMap: Texture;

  heightScale: number;

  metalFactor: number;
  roughFactor: number;

  emission: Texture;
  emissionFactor: vec4;

  // store a list!
  irridance: Cubemap;
  specular: Cubemap;
  brdf: Texture;
  skyboxIntensity: number;

  // use a flag to indicate whether the model matrix should be used as an attribute
  // probably use a step func to snag the right one

  cameraPos: vec3;

  private static locs: {
    modelMat: WebGLUniformLocation,
    vpMat: WebGLUniformLocation,
    normalMat: WebGLUniformLocation,
    lightCount: WebGLUniformLocation,

    jointMatrix: Array<WebGLUniformLocation>,
    jointMatrixNormal: Array<WebGLUniformLocation>,

    useSkeletalAnimation: WebGLUniformLocation,

    lightCountNoShadow: WebGLUniformLocation,
    ambientCount: WebGLUniformLocation,
    cameraPos: WebGLUniformLocation,

    texAlbedo: WebGLUniformLocation,
    texNorm: WebGLUniformLocation,
    texMetalRough: WebGLUniformLocation,
    texEmission: WebGLUniformLocation,
    
    texParallax: WebGLUniformLocation,
    parallaxHeightScale: WebGLUniformLocation,

    useAlbedo: WebGLUniformLocation,
    useNorm: WebGLUniformLocation,
    useRough: WebGLUniformLocation,
    useEmission: WebGLUniformLocation,

    useParallax: WebGLUniformLocation,

    albedoDef: WebGLUniformLocation,
    roughDef: WebGLUniformLocation,
    metalDef: WebGLUniformLocation,
    emissionFactor: WebGLUniformLocation,

    useAttribute: WebGLUniformLocation,

    irridance: WebGLUniformLocation,
    specular: WebGLUniformLocation,
    brdf: WebGLUniformLocation,
    skyboxIntensity: WebGLUniformLocation,
    specSize: WebGLUniformLocation,
    useIrridance: WebGLUniformLocation

    irridance_l: WebGLUniformLocation,
    specular_l: WebGLUniformLocation,
    specSize_l: WebGLUniformLocation,
    skyboxIntensity_l: WebGLUniformLocation,
    useIrridance_l: WebGLUniformLocation
  } = null;

  private static attribs: {
    pos: number,
    norm: number,
    tex: number,
    tan: number,

    joints: number,
    weights: number,

    modelMat: number,
    normMat: number
  };

  constructor(ctx: GameContext) {
    this.ctx = ctx;

    this.placeholder = new TextureDummy(ctx);
    this.placeholderNorm = new TextureDummy(ctx);
    this.placeholderARM = new TextureDummy(ctx);
    this.placeholderEmission = new TextureDummy(ctx);
    this.placeholderParallax = new TextureDummy(ctx);


    this.vpMat = mat4.create();
    this.modelMat = mat4.create();
    this.normal = null;
    this.color = null;
    this.heightMap = null;
    this.irridance = null;
    this.specular = null;
    this.brdf = null;
    this.colorFactor = vec4.create();
    this.metalRough = null;
    this.metalFactor = 1.0;
    this.roughFactor = 1.0;
    this.heightScale = 0.1;
    this.emissionFactor = vec4.create();
    this.emission = null;
    this.placeholderCube = new ColorCubemap(ctx, 8);
    this.placeholderCubeSpec = new ColorCubemap(ctx, 8);
    this.placeholderBRDF = new TextureDummy(ctx);

    this.placeholderCubeSub = new ColorCubemap(ctx, 8);
    this.placeholderCubeSpecSub = new ColorCubemap(ctx, 8);

    this.spotPlaceholders = [];

    for (let i = 0; i < 4; i++) {
      this.spotPlaceholders.push(new TextureDummy(ctx));
    }

    this.skyboxes = [];
    vec4.zero(this.emissionFactor);

    this.cameraPos = vec3.create();

    ctx.getGLExtension("EXT_shader_texture_lod");
    ctx.getGLExtension("OES_standard_derivatives");

    this.modelMatrixIndex = -1;
    let gl = ctx.getGLContext();
    this.normalBuffer = new GLBufferImpl(ctx, undefined, gl.DYNAMIC_DRAW);

    // note: make it obvious that the shader returned is the same?
    // note: statics are going to conflict with one another
    if (PBRMaterialImpl.progLoading === false) {
      PBRMaterialImpl.progLoading = true;
      new ShaderProgramBuilder(ctx)
      .withVertexShader(getEnginePath("engine/glsl/pbr/pbr.vert"))
      .withFragmentShader(getEnginePath("engine/glsl/pbr/pbr.frag"))
      .build()
      .then(this.configureProgram.bind(this));
    }
  }

  private configureProgram(prog: WebGLProgram) {
    PBRMaterialImpl.prog = prog;
    let gl = this.ctx.getGLContext();

    if (PBRMaterialImpl.locs === null) {

      PBRMaterialImpl.locs = {
        modelMat: gl.getUniformLocation(prog, "model_matrix"),
        vpMat: gl.getUniformLocation(prog, "vp_matrix"),
        normalMat: gl.getUniformLocation(prog, "normal_matrix"),
        lightCount: gl.getUniformLocation(prog, "spotlightCount"),
  
        jointMatrix: [],
        jointMatrixNormal: [],
        useSkeletalAnimation: gl.getUniformLocation(prog, "useSkeletalAnimation"),
  
        lightCountNoShadow: gl.getUniformLocation(prog, "spotlightCount_no_shadow"),
        ambientCount: gl.getUniformLocation(prog, "ambientCount"),
        cameraPos: gl.getUniformLocation(prog, "camera_pos"),
        texAlbedo: gl.getUniformLocation(prog, "tex_albedo"),
        texNorm: gl.getUniformLocation(prog, "tex_norm"),
        texMetalRough: gl.getUniformLocation(prog, "tex_metal_rough"),
        texEmission: gl.getUniformLocation(prog, "tex_emission"),
        texParallax: gl.getUniformLocation(prog, "tex_parallax"),
  
        parallaxHeightScale: gl.getUniformLocation(prog, "parallax_heightscale"),
  
        useAlbedo: gl.getUniformLocation(prog, "use_albedo"),
        useNorm: gl.getUniformLocation(prog, "use_norm"),
        useRough: gl.getUniformLocation(prog, "use_metal_rough"),
        useEmission: gl.getUniformLocation(prog, "use_emission"),
        useParallax: gl.getUniformLocation(prog, "use_parallax"),
        albedoDef: gl.getUniformLocation(prog, "color_factor"),
        roughDef: gl.getUniformLocation(prog, "rough_factor"),
        metalDef: gl.getUniformLocation(prog, "metal_factor"),
        emissionFactor: gl.getUniformLocation(prog, "emission_factor"),
        useAttribute: gl.getUniformLocation(prog, "is_instanced"),
        irridance: gl.getUniformLocation(prog, "irridance"),
        specular: gl.getUniformLocation(prog, "specular"),
        brdf: gl.getUniformLocation(prog, "brdf"),
        skyboxIntensity: gl.getUniformLocation(prog, "skyboxIntensity"),
        specSize: gl.getUniformLocation(prog, "specSize"),
        useIrridance: gl.getUniformLocation(prog, "useIrridance"),
  
        irridance_l: gl.getUniformLocation(prog, "irridance_l"),
        specular_l: gl.getUniformLocation(prog, "specular_l"),
        specSize_l: gl.getUniformLocation(prog, "specSize_l"),
        skyboxIntensity_l: gl.getUniformLocation(prog, "skyboxIntensity_l"),
        useIrridance_l: gl.getUniformLocation(prog, "useIrridance_l")
      };
    }

    PBRMaterialImpl.attribs = {
      pos: gl.getAttribLocation(prog, "position"),
      norm: gl.getAttribLocation(prog, "normal"),
      tex: gl.getAttribLocation(prog, "texcoord"),
      tan: gl.getAttribLocation(prog, "tangent"),
      joints: gl.getAttribLocation(prog, "joints"),
      weights: gl.getAttribLocation(prog, "weights"),
      modelMat: gl.getAttribLocation(prog, "a_model_matrix"),
      normMat: gl.getAttribLocation(prog, "a_normal_matrix")
    };

    for (let i = 0; i < 32; i++) {
      PBRMaterialImpl.locs.jointMatrix.push(gl.getUniformLocation(prog, `jointMatrix[${i}]`));
      PBRMaterialImpl.locs.jointMatrixNormal.push(gl.getUniformLocation(prog, `jointMatrixNormal[${i}]`));
    }

    PBRMaterialImpl.progWrap = new GLProgramWrap(gl, PBRMaterialImpl.prog);

    PBRMaterialImpl.spotLightUniforms = [];
    PBRMaterialImpl.spotLightUniformsNoShadow = [];

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

      (i % 2 === 0 ? PBRMaterialImpl.spotLightUniforms : PBRMaterialImpl.spotLightUniformsNoShadow).push(uni);
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

  setSkybox(skybox: Array<SkyboxInfo>) {
    this.skyboxes = skybox;
  }

  setModelMatrixIndex(index: number) {
    this.modelMatrixIndex = index;
  }

  private calculateNormalMatrixFromBuffer(buf: GLBufferReadOnly, instances: number) {
    CalculateNormalMatrixFromBuffer(buf, this.normalBuffer, instances, 0, 0);
  }

  prepareAttributes(model: InstancedModel, instances: number, rc: RenderContext) {
    let gl = this.ctx.getGLContext();
    const wrap = this.ctx.getGL();

    // there's some setup that happens here which breaks the shadow renderer, when the prog fails
    // to compile the shadow view looks just fine so i will have to investigate further :(
    if (PBRMaterialImpl.prog !== null) {
      wrap.useProgram(PBRMaterialImpl.prog);

      this.setSpotLight(rc.getSpotLightInfo());
      this.setAmbientLight(rc.getAmbientLightInfo());

      let info = rc.getActiveCameraInfo(); 
      gl.uniformMatrix4fv(PBRMaterialImpl.locs.vpMat, false, info.vpMatrix);

      let shadowSpot = 0;
      let noShadowSpot = 0;
      if (this.spot) {
        for (let i = 0; i < this.spot.length; i++) {
          if (this.spot[i].hasShadow() && shadowSpot < 4) {
            this.spot[i].setShadowTextureIndex(shadowSpot + 4);
            this.bindSpotLightStruct(this.spot[i], PBRMaterialImpl.spotLightUniforms[shadowSpot]);
            shadowSpot++;
          } else {
            this.bindSpotLightStruct(this.spot[i], PBRMaterialImpl.spotLightUniformsNoShadow[noShadowSpot]);
            noShadowSpot++;
          }
        }
      }

      for (let i = shadowSpot; i < 4; i++) {

        this.spotPlaceholders[i].bindToUniform(PBRMaterialImpl.spotLightUniforms[i].shadowtex, i + 4);
      }

      gl.uniform1i(PBRMaterialImpl.locs.lightCount, shadowSpot);
      gl.uniform1i(PBRMaterialImpl.locs.lightCountNoShadow, noShadowSpot);

      if (this.amb) {
        for (let i = 0; i < this.amb.length && i < 4; i++) {
          this.amb[i].bindToUniformByName(PBRMaterialImpl.progWrap, `ambient[${i}]`);
        }

        gl.uniform1i(PBRMaterialImpl.locs.ambientCount, this.amb.length);
      } else {
        gl.uniform1i(PBRMaterialImpl.locs.ambientCount, 0);
      }


      gl.uniform3fv(PBRMaterialImpl.locs.cameraPos, info.cameraPosition);

      if (this.color === null) {
        this.placeholder.bindToUniform(PBRMaterialImpl.locs.texAlbedo, 0);
        gl.uniform1i(PBRMaterialImpl.locs.useAlbedo, 0);
      } else {  // this.color instanceof Texture*
        this.color.bindToUniform(PBRMaterialImpl.locs.texAlbedo, 0);
        gl.uniform1i(PBRMaterialImpl.locs.useAlbedo, 1);
      }
      
      gl.uniform4fv(PBRMaterialImpl.locs.albedoDef, this.colorFactor);

      gl.uniform1i(PBRMaterialImpl.locs.useAttribute, 1);

      if (this.normal === null) {
        this.placeholderNorm.bindToUniform(PBRMaterialImpl.locs.texNorm, 1);
        gl.uniform1i(PBRMaterialImpl.locs.useNorm, 0);
      } else {
        this.normal.bindToUniform(PBRMaterialImpl.locs.texNorm, 1);
        gl.uniform1i(PBRMaterialImpl.locs.useNorm, 1);
      }

      if (this.metalRough === null) {
        this.placeholderARM.bindToUniform(PBRMaterialImpl.locs.texMetalRough, 2);
        gl.uniform1i(PBRMaterialImpl.locs.useRough, 0);
      } else {
        this.metalRough.bindToUniform(PBRMaterialImpl.locs.texMetalRough, 2);
        gl.uniform1i(PBRMaterialImpl.locs.useRough, 1);
      }

      if (this.emission === null) {
        this.placeholderEmission.bindToUniform(PBRMaterialImpl.locs.texEmission, 3);
        gl.uniform1i(PBRMaterialImpl.locs.useEmission, 0);
      } else {
        this.emission.bindToUniform(PBRMaterialImpl.locs.texEmission, 3);
        gl.uniform1i(PBRMaterialImpl.locs.useEmission, 1);
      }

      gl.uniform1f(PBRMaterialImpl.locs.parallaxHeightScale, this.heightScale);

      if (this.heightMap === null) {
        gl.uniform1i(PBRMaterialImpl.locs.useParallax, 0);
        this.placeholderParallax.bindToUniform(PBRMaterialImpl.locs.texParallax, 4);
      } else {
        gl.uniform1i(PBRMaterialImpl.locs.useParallax, 1);
        this.heightMap.bindToUniform(PBRMaterialImpl.locs.texParallax, 4);
      }
      
      gl.uniform1f(PBRMaterialImpl.locs.roughDef, this.roughFactor);
      gl.uniform1f(PBRMaterialImpl.locs.metalDef, this.metalFactor);
      gl.uniform4fv(PBRMaterialImpl.locs.emissionFactor, this.emissionFactor);

      const skyboxList = rc.getSkybox();
      if (skyboxList.length > 0 && skyboxList[0].irridance !== null && skyboxList[0].specular !== null && skyboxList[0].brdf !== null) {
        const skybox = skyboxList[0];
        skybox.irridance.bindToUniform(PBRMaterialImpl.locs.irridance, 8);
        skybox.specular.bindToUniform(PBRMaterialImpl.locs.specular, 9);
        skybox.brdf.bindToUniform(PBRMaterialImpl.locs.brdf, 10);

        gl.uniform1f(PBRMaterialImpl.locs.specSize, skybox.specular.dims);
        gl.uniform1f(PBRMaterialImpl.locs.skyboxIntensity, skybox.intensity);
        gl.uniform1i(PBRMaterialImpl.locs.useIrridance, 1);
      } else {
        // need more cubes!!!!!
        this.placeholderCube.bindToUniform(PBRMaterialImpl.locs.irridance, 8);
        this.placeholderCubeSpec.bindToUniform(PBRMaterialImpl.locs.specular, 9);
        this.placeholderBRDF.bindToUniform(PBRMaterialImpl.locs.brdf, 10);
        gl.uniform1f(PBRMaterialImpl.locs.skyboxIntensity, 0.0);
        gl.uniform1i(PBRMaterialImpl.locs.useIrridance, 0);
      }

      if (skyboxList.length > 1 && skyboxList[1].irridance !== null && skyboxList[1].specular !== null && skyboxList[1].brdf !== null) {
        const skybox = skyboxList[1];
        skybox.irridance.bindToUniform(PBRMaterialImpl.locs.irridance_l, 11);
        skybox.specular.bindToUniform(PBRMaterialImpl.locs.specular_l, 12);

        gl.uniform1f(PBRMaterialImpl.locs.specSize_l, skybox.specular.dims);
        gl.uniform1f(PBRMaterialImpl.locs.skyboxIntensity_l, skybox.intensity);
        gl.uniform1i(PBRMaterialImpl.locs.useIrridance_l, 1);
      } else {
        // need more cubes!!!!!
        this.placeholderCubeSub.bindToUniform(PBRMaterialImpl.locs.irridance_l, 11);
        this.placeholderCubeSpecSub.bindToUniform(PBRMaterialImpl.locs.specular_l, 12);
        gl.uniform1f(PBRMaterialImpl.locs.skyboxIntensity_l, 0.0);
        gl.uniform1i(PBRMaterialImpl.locs.useIrridance_l, 0);
      }

      model.bindAttribute(AttributeType.POSITION, PBRMaterialImpl.attribs.pos);
      model.bindAttribute(AttributeType.NORMAL, PBRMaterialImpl.attribs.norm);
      model.bindAttribute(AttributeType.TEXCOORD, PBRMaterialImpl.attribs.tex);
      model.bindAttribute(AttributeType.TANGENT, PBRMaterialImpl.attribs.tan);

      if (model.getArmature()) {
        gl.uniform1i(PBRMaterialImpl.locs.useSkeletalAnimation, 1);

        const bones = model.getArmature().getJointMatrices();
        const bonesNormal = model.getArmature().getJointNormalMatrices();
        for (let i = 0; i < bones.length && i < 32; i++) {
          gl.uniformMatrix4fv(PBRMaterialImpl.locs.jointMatrix[i], false, bones[i]);
          gl.uniformMatrix3fv(PBRMaterialImpl.locs.jointMatrixNormal[i], false, bonesNormal[i]);
        }

        model.bindAttribute(AttributeType.JOINT, PBRMaterialImpl.attribs.joints);
        model.bindAttribute(AttributeType.WEIGHT, PBRMaterialImpl.attribs.weights);
      } else {
        gl.uniform1i(PBRMaterialImpl.locs.useSkeletalAnimation, 0);
      }

      for (let i = 0; i < 4; i++) {
        let loc = PBRMaterialImpl.attribs.modelMat + i;
        let byteOffset = i * 16;
        model.instanceAttribPointer(this.modelMatrixIndex, loc, 4, gl.FLOAT, false, 64, byteOffset);
      }

      let modelmats = model.getReadOnlyBuffer(this.modelMatrixIndex);
      // TODO: allow this field to be initialized externally?
      this.calculateNormalMatrixFromBuffer(modelmats, instances);
      for (let i = 0; i < 3; i++) {
        let loc = PBRMaterialImpl.attribs.normMat + i;
        let byteOffset = i * 12;
        this.normalBuffer.bindToInstancedVertexAttribute(loc, 3, gl.FLOAT, false, 36, byteOffset);
      }
    }
  }

  cleanUpAttributes() {
    for (let i = 0; i < 3; i++) {
      this.normalBuffer.disableInstancedVertexAttribute(PBRMaterialImpl.attribs.normMat + i);
    }
  }

  drawMaterial(model: Model) {
    let gl = this.ctx.getGLContext();
    const wrap = this.ctx.getGL();
    if (PBRMaterialImpl.prog !== null) {
      wrap.useProgram(PBRMaterialImpl.prog);

      let normalMat = mat3.create();
      normalMat = mat3.fromMat4(normalMat, this.modelMat);
      normalMat = mat3.transpose(normalMat, normalMat);
      normalMat = mat3.invert(normalMat, normalMat);

      gl.uniformMatrix4fv(PBRMaterialImpl.locs.modelMat, false, this.modelMat);
      gl.uniformMatrix4fv(PBRMaterialImpl.locs.vpMat, false, this.vpMat);
      gl.uniformMatrix3fv(PBRMaterialImpl.locs.normalMat, false, normalMat);

      let useSkyboxMain = false;
      if (this.skyboxes.length > 0) {
        const skybox = this.skyboxes[0];
        if (skybox.irridance !== null && skybox.specular !== null && skybox.brdf !== null) {
          skybox.irridance.bindToUniform(PBRMaterialImpl.locs.irridance, 8);
          skybox.specular.bindToUniform(PBRMaterialImpl.locs.specular, 9);
          skybox.brdf.bindToUniform(PBRMaterialImpl.locs.brdf, 10);
          wrap.uniform1f(PBRMaterialImpl.locs.specSize, skybox.specular.dims);
          wrap.uniform1f(PBRMaterialImpl.locs.skyboxIntensity, skybox.intensity);
          wrap.uniform1i(PBRMaterialImpl.locs.useIrridance, 1);
          useSkyboxMain = true;
        }
      }
    
      if (!useSkyboxMain) {
        this.placeholderCube.bindToUniform(PBRMaterialImpl.locs.irridance, 8);
        this.placeholderCubeSpec.bindToUniform(PBRMaterialImpl.locs.specular, 9);
        this.placeholderBRDF.bindToUniform(PBRMaterialImpl.locs.brdf, 10);
        wrap.uniform1f(PBRMaterialImpl.locs.skyboxIntensity, 0.0);
        wrap.uniform1i(PBRMaterialImpl.locs.useIrridance, 0);
      }

      let useSkyboxSub = false;
      if (this.skyboxes.length > 1) {
        const skybox = this.skyboxes[1];
        if (skybox.irridance !== null && skybox.specular !== null && skybox.brdf !== null) {
          skybox.irridance.bindToUniform(PBRMaterialImpl.locs.irridance_l, 11);
          skybox.specular.bindToUniform(PBRMaterialImpl.locs.specular_l, 12);
          wrap.uniform1f(PBRMaterialImpl.locs.specSize_l, skybox.specular.dims);
          wrap.uniform1f(PBRMaterialImpl.locs.skyboxIntensity_l, skybox.intensity);
          wrap.uniform1i(PBRMaterialImpl.locs.useIrridance_l, 1);
          useSkyboxSub = true;
        }
      }

      if (!useSkyboxSub) {
        this.placeholderCubeSub.bindToUniform(PBRMaterialImpl.locs.irridance_l, 11);
        this.placeholderCubeSpecSub.bindToUniform(PBRMaterialImpl.locs.specular_l, 12);
        wrap.uniform1f(PBRMaterialImpl.locs.skyboxIntensity_l, 0.0);
        wrap.uniform1i(PBRMaterialImpl.locs.useIrridance_l, 0);
      }

      let shadowSpot = 0;
      let noShadowSpot = 0;
      if (this.spot) {
        for (let i = 0; i < this.spot.length; i++) {
          if (this.spot[i].hasShadow() && shadowSpot < 4) {
            this.spot[i].setShadowTextureIndex(shadowSpot + 4);
            this.bindSpotLightStruct(this.spot[i], PBRMaterialImpl.spotLightUniforms[shadowSpot]);
            shadowSpot++;
          } else {
            this.bindSpotLightStruct(this.spot[i], PBRMaterialImpl.spotLightUniformsNoShadow[noShadowSpot]);
            noShadowSpot++;
          }
        }
      }

      for (let i = shadowSpot; i < 4; i++) {
        this.spotPlaceholders[i].bindToUniform(PBRMaterialImpl.spotLightUniforms[i].shadowtex, i + 4);
      }

      wrap.uniform1i(PBRMaterialImpl.locs.lightCount, shadowSpot);
      wrap.uniform1i(PBRMaterialImpl.locs.lightCountNoShadow, noShadowSpot);
      gl.uniform3fv(PBRMaterialImpl.locs.cameraPos, this.cameraPos);

      if (!this.color) {
        this.placeholder.bindToUniform(PBRMaterialImpl.locs.texAlbedo, 0);
        wrap.uniform1i(PBRMaterialImpl.locs.useAlbedo, 0);
      } else {  // this.color instanceof Texture*
        this.color.bindToUniform(PBRMaterialImpl.locs.texAlbedo, 0);
        wrap.uniform1i(PBRMaterialImpl.locs.useAlbedo, 1);
      }
      
      gl.uniform4fv(PBRMaterialImpl.locs.albedoDef, this.colorFactor);

      if (!this.normal) {
        this.placeholderNorm.bindToUniform(PBRMaterialImpl.locs.texNorm, 1);
        wrap.uniform1i(PBRMaterialImpl.locs.useNorm, 0);
      } else {
        this.normal.bindToUniform(PBRMaterialImpl.locs.texNorm, 1);
        wrap.uniform1i(PBRMaterialImpl.locs.useNorm, 1);
      }

      if (!this.metalRough) {
        this.placeholderARM.bindToUniform(PBRMaterialImpl.locs.texMetalRough, 2);
        wrap.uniform1i(PBRMaterialImpl.locs.useRough, 0);
      } else {
        this.metalRough.bindToUniform(PBRMaterialImpl.locs.texMetalRough, 2);
        wrap.uniform1i(PBRMaterialImpl.locs.useRough, 1);
      }

      if (this.emission === null) {
        this.placeholderEmission.bindToUniform(PBRMaterialImpl.locs.texEmission, 3);
        wrap.uniform1i(PBRMaterialImpl.locs.useEmission, 0);
      } else {
        this.emission.bindToUniform(PBRMaterialImpl.locs.texEmission, 3);
        wrap.uniform1i(PBRMaterialImpl.locs.useEmission, 1);
      }

      gl.uniform1f(PBRMaterialImpl.locs.parallaxHeightScale, this.heightScale);

      if (this.heightMap === null) {
        wrap.uniform1i(PBRMaterialImpl.locs.useParallax, 0);
        this.placeholderParallax.bindToUniform(PBRMaterialImpl.locs.texParallax, 4);
      } else {
        wrap.uniform1i(PBRMaterialImpl.locs.useParallax, 1);
        this.heightMap.bindToUniform(PBRMaterialImpl.locs.texParallax, 4);
      }
      
      wrap.uniform1f(PBRMaterialImpl.locs.roughDef, this.roughFactor);
      wrap.uniform1f(PBRMaterialImpl.locs.metalDef, this.metalFactor);

      gl.uniform4fv(PBRMaterialImpl.locs.emissionFactor, this.emissionFactor);

      wrap.uniform1i(PBRMaterialImpl.locs.useAttribute, 0);

      model.bindAttribute(AttributeType.POSITION, PBRMaterialImpl.attribs.pos);
      model.bindAttribute(AttributeType.NORMAL, PBRMaterialImpl.attribs.norm);
      model.bindAttribute(AttributeType.TEXCOORD, PBRMaterialImpl.attribs.tex);
      model.bindAttribute(AttributeType.TANGENT, PBRMaterialImpl.attribs.tan);

      if (model.getArmature()) {
        wrap.uniform1i(PBRMaterialImpl.locs.useSkeletalAnimation, 1);

        const bones = model.getArmature().getJointMatrices();
        const bonesNormal = model.getArmature().getJointNormalMatrices();
        for (let i = 0; i < bones.length && i < 32; i++) {
          gl.uniformMatrix4fv(PBRMaterialImpl.locs.jointMatrix[i], false, bones[i]);
          gl.uniformMatrix3fv(PBRMaterialImpl.locs.jointMatrixNormal[i], false, bonesNormal[i]);
        }

        model.bindAttribute(AttributeType.JOINT, PBRMaterialImpl.attribs.joints);
        model.bindAttribute(AttributeType.WEIGHT, PBRMaterialImpl.attribs.weights);
      } else {
        wrap.uniform1i(PBRMaterialImpl.locs.useSkeletalAnimation, 0);
        
      }

      model.draw();
    }
    
  }
}
