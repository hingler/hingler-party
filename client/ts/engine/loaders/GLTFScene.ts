import { Texture } from "../gl/Texture";
import { InstancedModel } from "../model/InstancedModel";
import { Model } from "../model/Model";
import { PBRInstanceFactory } from "../model/PBRInstanceFactory";
import { PBRModel } from "../model/PBRModel";
import { GameObject } from "../object/game/GameObject";

/**
 * Represents the data contained inside a GLTF file
 * in a way which allows users to fetch data from it.
 */
export interface GLTFScene {
  /**
   * 
   * @param name - the name of the desired texture within the GLTF file, or its index.
   * @returns the texture which has the desired name, or null if the texture could not be found.
   */
  getTexture(name: string) : Texture;

  /**
   * @param name - the name of the desired model.
   * @returns the model, with no associated materials or textures attached.
   */
  getModel(name: string | number) : Model;

  /**
   * Returns a game object representing the desired node -- contains no behavior.
   */
  getNodeAsGameObject(name: string | number) : GameObject;

  /**
   * Returns a new InstancedModel.
   * 
   * Instanced models consume materials which then draw said instanced models onto the screen.
   * Additionally, instanced models provide a means by which users can append instance data,
   * and draw.
   * @param name 
   */
  getInstancedModel(name: string | number) : InstancedModel;

  /**
   * 
   * @param model - either the name of the model, or the index associated with it.
   * @returns a new PBRModel.
   */
  getPBRModel(model: string | number) : PBRModel;

  /**
   * Creates an instance factory, which can be used to distribute and configure multiple instances
   * of an instanced model.
   * @param model - the model which we wish to instance.
   */
  getPBRInstanceFactory(model: string | number) : PBRInstanceFactory;

  /**
   * Returns number of meshes stored within the scene.
   */
  getModelCount() : number;

  // TODO: getPBRModel -- handle materials, textures, etc. if available.
}