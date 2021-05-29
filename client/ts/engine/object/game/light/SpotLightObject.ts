import { mat4, vec3, vec4 } from "gl-matrix";
import { Framebuffer } from "../../../gl/Framebuffer";
import { ShadowFramebuffer } from "../../../gl/internal/ShadowFramebuffer";
import { GameContext } from "../../../GameContext";
import { CameraInfo } from "../Camera";
import { GameObject } from "../GameObject";
import { SpotLight } from "./SpotLight";

export class SpotLightObject extends GameObject implements SpotLight {
  fov: number;
  near: number;
  far: number;

  falloffRadius: number;
  intensity: number;
  color: vec4;

  atten_const: number;
  atten_linear: number;
  atten_quad: number;

  private fb: ShadowFramebuffer;
  private shadows: boolean;
  constructor(ctx: GameContext) {
    super(ctx);
    // TODO: find some way to store consts like shadow map size across objects
    this.fb = new ShadowFramebuffer(ctx, [512, 512]);
    this.fov = 45;
    this.near = 0.1;
    this.far = 1000.0;
    this.falloffRadius = 1;
    this.color = vec4.create();
    this.intensity = 1;
    this.shadows = true;
  }

  setShadowDims(dim_a: [number, number] | number, dim_b?: number) {
    // maintain a color texture for rendering
    // i mean at that point we might as well manage the whole framebuffer here
    let dims = (typeof dim_a === "number" ? [dim_a, dim_b] : dim_a) as [number, number];
    if (dims[0] < 1 || dims[1] < 1) {
      let err = "Invalid values for shadow dimensions!";
      console.error(err);
      throw Error(err);
    }
    if (dims[0] !== dims[1]) {
      let err = "Shadow texture must be square!";
      console.error(err);
      throw Error(err);
    } else if ((dims[0] & (dims[0] - 1)) !== 0) {
      let err = "Dimensions must be power of two!";
      console.error(err);
      throw Error(err);
    }
    
    this.fb.setFramebufferSize(dims);
  }

  getShadowDims() {
    return Array.from(this.fb.dims) as [number, number];
  }

  getDirectionVector() {
    let mat = this.getTransformationMatrix();
    let dir: vec4 = new Float32Array([0, 0, -1, 0]);
    vec4.transformMat4(dir, dir, mat);
    vec4.normalize(dir, dir);
    return vec3.fromValues(dir[0], dir[1], dir[2]);
  }

  getLightMatrix() {
    let mat = this.getTransformationMatrix();
    let res = mat4.create();
    mat4.copy(res, mat);
    mat4.invert(res, res);
    let persp = mat4.create();
    mat4.perspective(persp, this.fov * (Math.PI / 180), 1, this.near, this.far);
    mat4.mul(res, persp, res);
    return res;
  }

  /**
   * @returns this light's perspective as a CameraInfo.
   */
  getLightMatrixAsCameraInfo() {
    // zero, bc our transformation matrix will move it
    let pos = vec3.create();
    vec3.zero(pos);
    vec3.transformMat4(pos, pos, this.getTransformationMatrix());

    
    let view = mat4.create();
    mat4.copy(view, this.getTransformationMatrix());
    mat4.invert(view, view);
    
    let persp = mat4.create();
    mat4.perspective(persp, this.fov * (Math.PI / 180), 1, this.near, this.far);
    
    let vp = mat4.create();
    mat4.mul(vp, persp, view);


    let info : CameraInfo = {
      viewMatrix: view,
      perspectiveMatrix: persp,
      vpMatrix: vp,
      cameraPosition: pos
    };

    return info;
  }

  getShadowTexture() {
    return this.fb.getDepthTexture();
  }

  setShadows(toggle: boolean) {
    this.shadows = toggle;
  }

  getShadowState() {
    return this.shadows;
  }

  _getShadowFramebuffer() {
    return this.fb;
  }
}