import { mat4, ReadonlyMat4, vec3 } from "gl-matrix";
import { PostProcessingFilter } from "../../material/PostProcessingFilter";

export type FilterID = number;

export interface CameraInfo {
  // view transform, preinverted
  readonly viewMatrix: ReadonlyMat4;
  // perspective transform
  readonly perspectiveMatrix: ReadonlyMat4;
  // premultiplied view/perspective matrix, for convenience.
  readonly vpMatrix: ReadonlyMat4;

  // position of our camera in cartesian coordinates.
  readonly cameraPosition: vec3;
}

// basic camera interface
export interface Camera {
  // represents the vertical FOV, in degrees.
  fov: number;

  // represents the near and far clipping planes.
  near: number;
  far: number;

  /**
   * @returns the position of this camera in world space.
   */
  getGlobalPosition() : vec3;

  /**
   * @returns the product of this camera's view and perspective matrices.
   */
  getCameraMatrix() : mat4;

  /**
   * @returns information on this camera, including its view/perspective matrices.
   */
  getCameraInfo() : CameraInfo;

  /**
   * @returns this camera's view matrix only.
   */
  getViewMatrix() : mat4;

  /**
   * @returns this camera's perspective matrix only.
   */
  getPerspectiveMatrix() : mat4;

  /**
   * Sets this camera as active, and marks all other cameras as inactive.
   */
  setAsActive() : void;

  /**
   * Adds a postprocessing filter to this camera.
   * @returns a number which uniquely represents this filter wrt the camera.
   */
  addFilter(filter: PostProcessingFilter) : FilterID;

  /**
   * @returns an iterable structure over all postprocessing filters.
   */
  getFilters() : Iterable<PostProcessingFilter>;

  /**
   * Deletes a filter from this camera. Order of surrounding filters is preserved.
   * @returns true if fthe filter existed and was removed - false otherwise.
   */
  deleteFilter(filter: FilterID) : boolean;
}