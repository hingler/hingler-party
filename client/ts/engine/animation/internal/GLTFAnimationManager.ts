import { AnimationSampler } from "@hingler-party/nekogirl-valhalla/ts/animation/AnimationSampler";
import { quat, vec3 } from "gl-matrix";
import { AnimationData, AnimationManager } from "../AnimationManager";

export class GLTFAnimationManager implements AnimationManager {
  private positions: Map<number, AnimationSampler<vec3>>;
  private rotations: Map<number, AnimationSampler<quat>>;
  private scales: Map<number, AnimationSampler<vec3>>;
  constructor(positions: Map<number, AnimationSampler<vec3>>,
              rotations: Map<number, AnimationSampler<quat>>,
              scales: Map<number, AnimationSampler<vec3>>) {
    this.positions = positions;
    this.rotations = rotations;
    this.scales = scales;
  }

  sample(nodeID: number, time: number) {
    const posSampler = this.positions.get(nodeID);
    const rotSampler = this.rotations.get(nodeID);
    const scaSampler = this.scales.get(nodeID);

    const res : AnimationData = {}

    if (posSampler) {
      res.position = posSampler.sample(time, [] as number[] as vec3);
    }

    if (rotSampler) {
      res.rotation = rotSampler.sample(time, [] as number[] as quat);
    }

    if (scaSampler) {
      res.scale = scaSampler.sample(time, [] as number[] as vec3);
    }

    return res;
  }
}