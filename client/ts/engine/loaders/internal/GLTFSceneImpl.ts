import { quat, vec2, vec3, vec4 } from "gl-matrix";
import { GLAttribute } from "../../gl/GLAttribute";
import { GLAttributeImpl } from "../../gl/internal/GLAttributeImpl";
import { GLBuffer } from "../../gl/internal/GLBuffer";
import { GLBufferImpl } from "../../gl/internal/GLBufferImpl";
import { GLIndexImpl } from "../../gl/internal/GLIndexImpl";
import { GLTFTexture } from "../../gl/internal/GLTFTexture";
import { Texture } from "../../gl/Texture";
import { EngineContext } from "../../internal/EngineContext";
import { PBRInterface } from "../../material/PBRInterface";
import { PBRMaterialImpl } from "../../material/PBRMaterialImpl";
import { InstancedModel } from "../../model/InstancedModel";
import { Model } from "../../model/Model";
import { PBRInstanceFactory } from "../../model/PBRInstanceFactory";
import { GamePBRModel } from "../../object/game/GamePBRModel";
import { ArmatureManager } from "../../object/armature/ArmatureManager";
import { GLTFScene } from "../GLTFScene";
import { ArmatureBuilder } from "./ArmatureBuilder";
import { GLTFJson, ImageSchema, Material, Mesh, GLTFNode, Primitive, TextureSchema } from "./gltfTypes";
import { InstancedModelImpl } from "./InstancedModelImpl";
import { ModelImpl, ModelInstance } from "./ModelImpl";
import { PBRModelImpl } from "./PBRModelImpl";
import { AnimationManager } from "../../animation/AnimationManager";
import { GLTFAnimationBuilder } from "../../animation/GLTFAnimationBuilder";

// todo: holy shit this needs cleanup

export class GLTFSceneImpl implements GLTFScene {
  ctx         : EngineContext;
  gl          : WebGLRenderingContext;
  buffers     : Array<GLBuffer>;
  data        : GLTFJson;

  modelCache    : Map<number, ModelImpl>;
  modelCachePBR : Map<number, Array<ModelImpl>>;
  matCache      : Map<number, PBRMaterialImpl>;

  private animationData: Map<string, AnimationManager>;

  constructor(ctx: EngineContext, data: GLTFJson, buffers: Array<GLBuffer>) {
    this.ctx = ctx;
    this.gl = ctx.getGLContext();
    this.data = data;
    this.buffers = buffers;

    this.modelCache = new Map();
    this.modelCachePBR = new Map();
    this.matCache = new Map();

    this.animationData = new Map();
  }

  // check nodes first
  private getArmature(name: string | number) {
    // number is a meshid
    // string is a node name or mesh name
    // check nodes for a skin id
    if (typeof name === "string") {
      if (this.data.nodes) {
        for (let node of this.data.nodes) {
          if (node.name === name && node.skin !== undefined) {
            return this.getArmatureFromSkinID(node.skin);
          }
        }
      }
  
      // then check meshes for matching string
      if (this.data.meshes) {
        for (let i = 0; i < this.data.meshes.length; i++) {
          if (this.data.meshes[i].name === name) {
            return this.getArmatureFromMeshID(i);
          }
        }
      }
    } else {
      if (this.data.meshes && name < this.data.meshes.length) {
        return this.getArmatureFromMeshID(name);
      }
    }

    // then check meshes for a matching number
    return null;
  }

  // work off a string, or a number
  private getArmatureFromMeshID(meshID: number) {
    if (this.data.nodes) {
      for (let node of this.data.nodes) {
        if (node.mesh && node.mesh === meshID && node.skin !== undefined) {
          return this.getArmatureFromSkinID(node.skin);
        }
      }
    }

    return undefined;
  }

  // load an armature as a manager
  private getArmatureFromSkinID(skinID: number) {
    return ArmatureBuilder.skinToArmature(this.data, skinID, this.buffers, this.ctx);
  }

  
  getAnimationData(animationName: string) {
    if (this.animationData.has(animationName)) {
      return this.animationData.get(animationName);
    } else {
      // need to build it!
      if (!this.data.animations) {
        return null;
      }

      for (let animation of this.data.animations) {
        if (animation.name && animation.name === animationName) {
          const anim = GLTFAnimationBuilder.buildAnimationManager(this.data, animation, this.buffers);
          this.animationData.set(animationName, anim);
          return anim;
        }
      }

      return null;
    }
  }

  getModel(name: string | number) : Model {
    // nodes have skins
    let meshID = this.lookupMeshID(name);

    let mesh = this.data.meshes[meshID];
    let models : Array<ModelInstance> = []; 
    for (let prim of mesh.primitives) {

      let inst = this.getInstance(prim);
      models.push(inst);
    }

    let armature: ArmatureManager = this.getArmature(name);

    let res = new ModelImpl(models);

    if (typeof name === "string") {
      // probably the node name
      res.name = name;
    } else {
      res.name = this.getMeshName(meshID);
    }

    // figure out the skin, and nodeID, if relevant.

    return res;

  }

  getNodeAsGameObject(name: string | number) {
    let targNode : GLTFNode;
    if (!this.data.nodes) {
      return null;
    }
    if (typeof name === "string") {
      for (let node of this.data.nodes) {
        if (node.name === name) {
          targNode = node;
          break;
        }
      }
    } else {
      if (name < 0 || name >= this.data.nodes.length) {
        return null;
      }

      targNode = this.data.nodes[name];
    }

    if (!targNode.mesh) {
      console.warn("Attempted to load node which is not a model - i dont want to deal with it right now sorry");
    }

    let model = this.getPBRModel(targNode.mesh);
    let res = new GamePBRModel(this.ctx, model);
    if (targNode.rotation) {
      res.setRotationQuat(targNode.rotation);
    }

    if (targNode.translation) {
      res.setPosition(targNode.translation);
    }

    if (targNode.scale) {
      res.setScale(targNode.scale);
    }

    return res;
  }

  getInstancedModel(name: string) : InstancedModel {
    // create the instanced model
    let model = this.getModel(name) as ModelImpl;
    let instModel = new InstancedModelImpl(this.ctx, model);
    this.ctx.getGLTFLoader().registerInstancedModel(instModel);
    return instModel;
    // put it somewhere in the engine
    // the renderer will pick it up and flush it
  }

  getTexture(name: string | number) : Texture {
    if (typeof name === "string") {
      return this.getTextureFromName(name);
    } else {
      return this.getTextureFromNumber(name);
    }
  }

  private getTextureFromName(name: string) {
    if (this.data.textures) {
      for (let tex of this.data.textures) {
        let img = this.data.images[tex.source];
        if (img.name === name) {
          // TODO: alternative methods of fetching textures (name not always present)
          return this.texSchemaToTexture(tex, img);
        } 
      }
    }
  }

  private getTextureFromNumber(ind: number) {
    if (this.data.textures && ind < this.data.textures.length) {
      let tex = this.data.textures[ind];
      return this.texSchemaToTexture(tex, this.data.images[tex.source]);
    }
  }

  getModelCount() {
    return this.data.meshes.length;
  }

  private getInstancesAsModels(meshID: number) {
    if (this.modelCachePBR.has(meshID)) {
      return this.modelCachePBR.get(meshID);
    }

    let mesh = this.data.meshes[meshID];
    let models : Array<ModelImpl> = []; 
    for (let prim of mesh.primitives) {
      let inst = this.getInstance(prim);
      // caching is a mess
      // PBRArray should return models (from instances)
      // and materials
      
      let model = new ModelImpl([inst]);
      models.push(model);
    }

    this.modelCachePBR.set(meshID, models);
    return models;
  }

  // consumes a PBRInterface and a material and configures all fixed values in the PBRInterface.
  private configurePBR<T extends PBRInterface>(pbrMat: T, mat: Material) {
    if (mat.normalTexture && !this.ctx.mobile) {
      let normtex = this.getTextureFromNumber(mat.normalTexture.index);
      pbrMat.normal = normtex;
    }

    let pbrSchema = mat.pbrMetallicRoughness;

    if (pbrSchema.baseColorFactor) {
      pbrMat.colorFactor = pbrSchema.baseColorFactor;
    } else {
      pbrMat.colorFactor = [1, 1, 1, 1];
    }

    if (pbrSchema.baseColorTexture) {
      pbrMat.color = this.getTextureFromNumber(pbrSchema.baseColorTexture.index);
    }

    pbrMat.roughFactor = (pbrSchema.roughnessFactor !== undefined ? pbrSchema.roughnessFactor : 1.0);
    pbrMat.metalFactor = (pbrSchema.metallicFactor !== undefined ? pbrSchema.metallicFactor : 1.0);

    if (pbrSchema.metallicRoughnessTexture) {
      pbrMat.metalRough = this.getTextureFromNumber(pbrSchema.metallicRoughnessTexture.index);
    }

    if (mat.emissiveFactor) {
      const fac = vec4.create();
      fac[0] = mat.emissiveFactor[0];
      fac[1] = mat.emissiveFactor[1];
      fac[2] = mat.emissiveFactor[2];
      fac[3] = 1.0;
      pbrMat.emissionFactor = fac;
    } else {
      pbrMat.emissionFactor = vec4.zero(vec4.create());
    }

    return pbrMat;
  }

  private getPBRMaterials(meshID: number) {
    let mesh = this.data.meshes[meshID];
    let materials : Array<PBRMaterialImpl> = [];
    for (let prim of mesh.primitives) {
      if (this.matCache.has(prim.material)) {
        materials.push(this.matCache.get(prim.material));
        continue;
      }

      let mat = this.data.materials[prim.material];
      if (!mat) {
        const err = "Could not find relevant material";
        console.error(err);
        throw Error(err);
      }
      // create a PBRMaterial which mirrors that material
      // append it to an array

      let pbrMat = new PBRMaterialImpl(this.ctx);
      pbrMat = this.configurePBR(pbrMat, mat);

      materials.push(pbrMat);
    }

    return materials;
  }

  private lookupMeshID(model: string | number) {
    let meshID: number = -1;
    if (typeof model === "number") {
      meshID = model;
    } else {
      for (let i = 0; i < this.data.meshes.length; i++) {
        if (this.data.meshes[i].name === model) {
          meshID = i;
          break;
        }
      }

      // check node names -- sometimes they get mixed up
      if (meshID === -1 && this.data.nodes) {
        for (let i = 0; i < this.data.nodes.length; i++) {
          if (this.data.nodes[i].name === model && this.data.nodes[i].mesh !== undefined) {
            meshID = this.data.nodes[i].mesh;
            break;
          }
        }
      }
    }

    if (meshID < 0 || meshID >= this.data.meshes.length) {
      let err = "Invalid mesh identifier provided: " + model;
      console.error(err);
      throw err;
    }

    return meshID;
  }

  private getMeshName(meshID: number) {
    return this.data.meshes[meshID].name;
  }

  getPBRModel(model: string | number) {
    let meshID = this.lookupMeshID(model); 

    let [models, materials] = [this.getInstancesAsModels(meshID), this.getPBRMaterials(meshID)];
    let armature = this.getArmature(model);

    let res = new PBRModelImpl(this.ctx, models, materials, armature);
    if (typeof model === "string") {
      // probably the node name
      res.setName(model);
    } else {
      res.setName(this.getMeshName(meshID));
    }
    return res;
  }


  getPBRInstanceFactory(init: string | number) {
    // need multiple instances and materials
    let meshID = this.lookupMeshID(init);
    let [models, materials] = [this.getInstancesAsModels(meshID), this.getPBRMaterials(meshID)];

    const armature = this.getArmature(init);

    // queue these up under the meshID
    let modelsInstanced = models.map((model) => {
      let inst = new InstancedModelImpl(this.ctx, model);
      if (typeof init === "string") {
        // probably the node name
        model.name = init;
      } else {
        model.name = (this.getMeshName(meshID));
      }
      
      this.ctx.getGLTFLoader().registerInstancedModel(inst);
      return inst; 
    });


    return new PBRInstanceFactory(this.ctx, modelsInstanced, materials);
  }


  
  private texSchemaToTexture(texture: TextureSchema, img: ImageSchema) : Texture {
    if (!img.bufferView) {
      let err = "Loader does not currently handle image URIs.";
      console.error(err);
      throw Error(err);
    }

    let view = this.data.bufferViews[img.bufferView];
    if (!view) {
      let err = "Invalid GLTF file: view specified by image schema does not exist";
      console.error(err);
      throw Error(err);
    }

    let buffer = this.buffers[view.buffer];

    if (!buffer) {
      let err = "Buffer returned undefined while attempting to create a texture from it";
      console.error(err);
      throw Error(err);
    }
    let sampler = this.data.samplers[texture.sampler];
    if (!sampler) {
      let err = "Invalid GLTF file: sampler specified by texture schema does not exist";
      console.error(err);
      throw Error(err);
    }

    // we ultimately need the arraybuffer to gen an image
    // delegating that responsibility to the glbuffer is not to our benefit
    // the glbuffer replaces our "GL BUFFERS" (yeah everything is but whatever)
    let arrbuf = buffer.arrayBuffer();
    let off = view.byteOffset ? view.byteOffset : 0;
    let imgbuf = arrbuf.slice(off, view.byteLength + off);
    return new GLTFTexture(this.gl, imgbuf, sampler, img.mimeType);
  }

  private getInstance(prim: Primitive) {
    const inst = {} as ModelInstance;
    inst.positions      = this.createAttributeFromJSON(this.data, this.buffers, prim.attributes.POSITION);
    inst.normals        = this.createAttributeFromJSON(this.data, this.buffers, prim.attributes.NORMAL);
    inst.texcoords      = this.createAttributeFromJSON(this.data, this.buffers, prim.attributes.TEXCOORD_0);
    inst.tangents       = this.createAttributeFromJSON(this.data, this.buffers, prim.attributes.TANGENT);

    let joint = this.createAttributeFromJSON(this.data, this.buffers, prim.attributes.JOINTS_0);
    if (joint) {
      inst.joints = [joint];
    }

    let weight = this.createAttributeFromJSON(this.data, this.buffers, prim.attributes.WEIGHTS_0);
    if (weight) {
      inst.weights = [weight];
    }

    {
      // indices
      let indexAccessor = this.data.accessors[prim.indices];
      let indexView = this.data.bufferViews[indexAccessor.bufferView];
      let buffer = this.buffers[indexView.buffer];
      // copy buffer to indexBuffer
      // we reuse the arrbuf object, so there's no needless duplication of data
      // we just give it a fresh start as an element array
      let indexBuffer = buffer.copy();

      inst.indices = new GLIndexImpl(indexBuffer, indexAccessor, indexView);
    }

    return inst;
  }

  private createAttributeFromJSON(data: GLTFJson, buffers: Array<GLBuffer>, accessor: number) {
    if (accessor === undefined) {
      return null;
    }

    let ac = data.accessors[accessor];
    let view = data.bufferViews[ac.bufferView];
    let buffer = buffers[view.buffer];
    return new GLAttributeImpl(buffer, view, ac);
  }
}