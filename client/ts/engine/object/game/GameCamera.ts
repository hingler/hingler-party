import { mat4, vec3 } from "gl-matrix";
import { GameContext } from "../../GameContext";
import { PostProcessingFilter } from "../../material/PostProcessingFilter";
import { Camera, CameraInfo, FilterID } from "./Camera";
import { GameObject } from "./GameObject";

// i think this is ok since circular references wont be a problem
// might have to factor
export class GameCamera extends GameObject implements Camera {
  // fov, in degrees.
  fov: number;
  private active: boolean;

  near: number;
  far: number;

  private filterIDs: Array<FilterID>;
  private filters:   Array<PostProcessingFilter>;
  private lastFilter: FilterID;

  constructor(ctx: GameContext) {
    super(ctx);
    this.active = false;
    this.fov = 60;
    this.near = 0.1;
    this.far = 100.0;

    this.filterIDs = [];
    this.filters = [];
    this.lastFilter = 0;
  }

  getGlobalPosition() {
    let pos = this.getPosition();
    vec3.transformMat4(pos, pos, this.getTransformationMatrix());
    return pos;
  }

  getCameraMatrix() {
    let perspectiveMatrix = this.getPerspectiveMatrix();
    let viewMatrix = this.getViewMatrix();
    mat4.mul(viewMatrix, perspectiveMatrix, viewMatrix);
    return viewMatrix;
  }

  getCameraInfo() : CameraInfo {
    let pos = vec3.create();
    vec3.zero(pos);
    let mat = this.getTransformationMatrix();
    vec3.transformMat4(pos, pos, mat);
    let res = {
      viewMatrix: this.getViewMatrix(),
      perspectiveMatrix: this.getPerspectiveMatrix(),
      vpMatrix: mat4.create(),
      cameraPosition: this.getGlobalPosition()
    }

    mat4.mul(res.vpMatrix, res.perspectiveMatrix, res.viewMatrix);
    return res;
  }

  getViewMatrix() {
    let vm = mat4.copy(mat4.create(), this.getTransformationMatrix());
    mat4.invert(vm, vm);
    return vm;
  }

  getPerspectiveMatrix() {
    let dims = this.getContext().getScreenDims();
    let aspectRatio = dims[0] / dims[1];
    let pm = mat4.create();
    mat4.perspective(pm, this.fov * (Math.PI / 180.0), aspectRatio, this.near, this.far);
    return pm;
  }

  // todo2: set active camera?
  setAsActive() {
    // contract: only one active camera at a time
    let cur : GameObject = this;
    let parent = cur.getParent();
    while (parent !== null) {
      cur = parent;
      parent = cur.getParent();
    }

    this.findActiveCameraAndDeactivate(cur);
    // no cameras are active now, set this one as active
    this.active = true;    
  }

  isActive() : boolean {
    return this.active;
  }

  private deactivateCamera() {
    this.active = false;
  }

  private findActiveCameraAndDeactivate(root: GameObject) {
    if (root instanceof GameCamera) {
      let cam = root as GameCamera;
      if (cam.active) {
        cam.deactivateCamera();
        return;
      }
    }

    for (let child of root.getChildren()) {
      this.findActiveCameraAndDeactivate(child);
    }
  }

  addFilter(filter: PostProcessingFilter) {
    this.filterIDs.push(this.lastFilter);
    this.filters.push(filter);
    return this.lastFilter++;
  }

  getFilters() {
    return this.filters;
  }

  deleteFilter(filter: FilterID) {
    let cur = this.filterIDs.indexOf(filter);

    if (cur < 0) {
      return false;
    }

    this.filterIDs = this.filterIDs.splice(cur, 1);
    this.filters = this.filters.splice(cur, 1);
  }
}