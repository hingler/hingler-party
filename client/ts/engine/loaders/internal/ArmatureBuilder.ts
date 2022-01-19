import { mat4, ReadonlyMat4 } from "gl-matrix";
import { GLBuffer } from "../../gl/internal/GLBuffer";
import { ArmatureNode } from "../../object/armature/ArmatureNode";
import { ArmatureManager } from "../../object/armature/ArmatureManager";
import { GLTFJson, GLTFNode, GLTFSkin } from "./gltfTypes";
import { GameContext } from "../../GameContext";

export class ArmatureBuilder {
  // gltf data, skin index -> armaturenode
  // gltf data, skin index -> (unknown armature wrapper)
  static skinToArmature(data: GLTFJson, skinIndex: number, buffers: Array<GLBuffer>, ctx: GameContext) {
    if (!data.skins) {
      // no skins to fetch
      console.warn(`No skins present in this GLTF file.`);
      return null;
    }

    if (!data.skins[skinIndex]) {
      console.warn(`Skin index ${skinIndex} not present in GLTF file.`);
      return null;
    }
    
    // for each joint:
    // - get the node
    // - put it in an array
    const skin = data.skins[skinIndex];
    const nodeArray = this.getNodeArray(data, skin);
    if (!nodeArray) {
      // some important component was missing
      return null;
    }

    // then, inversebind
    // - get the buffer which contains our inversebind data
    // - we intend to use it as a mat4, so just read it from the GLBuffer.
    const inverseMatrices = this.getInverseBindMatrices(data, skin, buffers);

    // lastly, hierarchy
    // - go through our node list, creating ArmatureNodes when relevant.
    // - use a hash set to associate node numbers with armature nodes.
    // - if a child has not been created, go create it and add it to the hash set
    // set our node transforms to the values specified in the GLTF file
    
    // once all our nodes have been attached, go up the hierarchy to the root node
    // that's the one we want to return!!!
    const rootArmature = this.nodesToArmatureHierarchy(data, nodeArray, inverseMatrices);
    // DEBUG: so we can peek at it temporarily
    rootArmature.getJointMatrix();
    console.log(rootArmature);
    return new ArmatureManager(rootArmature, ctx);
    // animation manager
    // - just put the armature into the manager
    // (skipped for now)
    
  }

  private static getNodeArray(data: GLTFJson, skin: GLTFSkin) {
    if (!data.nodes) {
      // no nodes but armature data?
      return null;
    }

    const nodeArray : Array<number> = [];
    for (let jointIndex of skin.joints) {
      if (!data.nodes[jointIndex]) {
        // node index is invalid :(
        return null;
      }

      nodeArray.push(jointIndex);
    }

    return nodeArray;
  }

  private static getInverseBindMatrices(data: GLTFJson, skin: GLTFSkin, buffers: Array<GLBuffer>) {
    // should probably throw instead of returning null
    if (!data.buffers || !data.bufferViews || !data.accessors) {
      // mystery mode
      return null;
    }

    const res : Array<ReadonlyMat4> = [];
    if (!skin.inverseBindMatrices) {
      // assume identity for all
      for (let i = 0; i < skin.joints.length; i++) {
        res.push(mat4.identity(([] as number[]) as mat4));
      }
    } else {

      const inverseMatAccessor = data.accessors[skin.inverseBindMatrices];
      if (!inverseMatAccessor) {
        return null;
      }

      const inverseMatBufferView = data.bufferViews[inverseMatAccessor.bufferView];
      if (!inverseMatBufferView) {
        return null;
      }

      const inverseMatBuffer = buffers[inverseMatBufferView.buffer];
      if (!inverseMatBuffer) {
        return null;
      }

      const bufferOffset = (inverseMatBufferView.byteOffset || 0) + (inverseMatAccessor.byteOffset || 0);
      // this might be bad
      const bufferStride = (inverseMatBufferView.byteStride || 64);

      if (inverseMatAccessor.count < skin.joints.length) {
        // bad joints length
        return null;
      }

      console.log("here?");

      if (inverseMatBuffer.size() < (bufferStride * (inverseMatAccessor.count - 1) + 64 + bufferOffset)) {
        console.log(inverseMatBuffer.size());
        // not enough buffer space
        return null;
      }

      for (let i = 0; i < skin.joints.length; i++) {
        const mat = inverseMatBuffer.getFloat32Array(bufferOffset + bufferStride * i, 16) as ReadonlyMat4;
        res.push(mat);
      }
    }

    return res;
  }

  private static nodesToArmatureHierarchy(data: GLTFJson, nodeList: Array<number>, inverseBindMatrices: Array<ReadonlyMat4>) {
    const nodeMap: Map<number, ArmatureNode> = new Map();
    // map from node indices to 
    for (let i = 0; i < nodeList.length; i++) {
      const node = data.nodes[nodeList[i]];

      // we should have caught this already but just in case
      if (!node) {
        return null;
      }

      let armature : ArmatureNode;
      armature = this.createArmatureNodeFromGLTFNode(node, i, inverseBindMatrices[i], nodeList[i]);
      nodeMap.set(nodeList[i], armature);
    }

    for (let i = 0; i < nodeList.length; i++) {
      const armature = nodeMap.get(nodeList[i]);
      if (!armature) {
        console.warn("Armature not found in nodemap!");
        return null;
      }

      const node = data.nodes[nodeList[i]];
      if (node.children) {
        for (let child of node.children) {
          if (!nodeMap.has(child)) {
            // a child node was not found in the armature map.
            // it could be a non-armature, or a bug -- skip it for now
            console.warn("Child " + child + " not found in nodemap -- skipping...");
          }

          // add the specified child armature as a child!
          const childArmature = nodeMap.get(child);
          armature.addChild(childArmature);
        }
      }
    }

    // at this point, we should have an unambiguous parent node which is the root of our tree
    let parentNode = nodeMap.get(nodeList[0]);
    while (parentNode.getParent() !== null) {
      parentNode = parentNode.getParent();
    }

    return parentNode;
  }

  private static createArmatureNodeFromGLTFNode(node: GLTFNode, id: number, invMat: ReadonlyMat4, nodeID: number) {
    const res = new ArmatureNode(id, invMat);
    if (node.translation) {
      res.setPosition(node.translation);
    }

    if (node.rotation) {
      res.setRotationQuat(node.rotation);
    }

    if (node.scale) {
      res.setScale(node.scale);
    }

    res.setNodeID(nodeID);
    return res;
  }
}