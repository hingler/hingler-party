// animation manager includes several samplers, clustered by node ID
// we sample a given nodeID at a given time, and the sampler returns whatever it has (position as vec3, rotaiton as quat, scale as vec3)
import { vec3, quat } from "gl-matrix";

// note: we should be able to specify arb data -- i can handle that later
export interface AnimationData {
  position?: vec3,
  rotation?: quat,
  scale?: vec3
}

// putting this inside model and having it run automatically means we lose a bit of control
// we should pass an animation to an armature, and a time

// creating classes which facilitate this automatically (probably derivatives of GamePBRModel) is key
// produces a hierarchical mess

export interface AnimationManager {
  /**
   * Returns transform samples for a given node.
   * @param nodeID - the node in question
   * @param time - time in seconds to sample at.
   * @returns corresponding animation data.
   */
  sample(nodeID: number, time: number) : AnimationData;
}