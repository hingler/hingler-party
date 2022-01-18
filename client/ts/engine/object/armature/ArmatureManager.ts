import { ReadonlyMat3, ReadonlyMat4 } from "gl-matrix";
import { ArmatureNode } from "./ArmatureNode";

// should load a bunch of user-requested animations at once, and 
export class ArmatureManager {
  private root: ArmatureNode;
  private orderedJoints: Array<ArmatureNode>;
  // add animations later
  // animations can work by using existing splines -- sample, return joints

  constructor(root: ArmatureNode) {
    this.root = root;
    this.cacheArmatureNodes();
  }

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