import { ReadonlyMat3, ReadonlyMat4 } from "gl-matrix";
import { AnimationManager } from "../../animation/AnimationManager";
import { GameContext } from "../../GameContext";
import { ArmatureNode } from "./ArmatureNode";

// should load a bunch of user-requested animations at once, and 
export class ArmatureManager {
  private root: ArmatureNode;
  private orderedJoints: Array<ArmatureNode>;
  private ctx: GameContext;
  // add animations later
  // animations can work by using existing splines -- sample, return joints

  // probably pass ctx here
  constructor(root: ArmatureNode, ctx: GameContext) {
    this.root = root;
    this.cacheArmatureNodes();
    this.ctx = ctx;
  }

  // set an animator
  // when we call jointmatrices, update based on time step

  getJointMatrices() {
    const jointArray = [] as Array<ReadonlyMat4>;
    for (let joint of this.orderedJoints) {
      jointArray.push(joint.getJointMatrix());
    }

    return jointArray;
  }

  getJointNormalMatrices() {
    const jointArray = [] as Array<ReadonlyMat3>;
    for (let joint of this.orderedJoints) {
      jointArray.push(joint.getJointMatrixNormal());
    }

    return jointArray;
  }

  sampleFromAnimator(animator: AnimationManager, t: number) {
    for (let joint of this.orderedJoints) {
      const id = joint.nodeID;
      const animData = animator.sample(id, t);
      if (animData.position) {
        joint.setPosition(animData.position);
      }

      if (animData.rotation) {
        joint.setRotationQuat(animData.rotation);
      }

      if (animData.scale) {
        joint.setScale(animData.scale);
      }
    }
  }
  
  private cacheArmatureNodes() {
    this.orderedJoints = [];
    ArmatureManager.cacheArmatureNodes_recurse(this.root, this.orderedJoints);
    this.orderedJoints.sort((a, b) => a.getId() - b.getId());
  }

  private static cacheArmatureNodes_recurse(root: ArmatureNode, jointCache: Array<ArmatureNode>) {
    jointCache.push(root);
    for (let child of root.getChildren()) {
      this.cacheArmatureNodes_recurse(child, jointCache);
    }
  }
}