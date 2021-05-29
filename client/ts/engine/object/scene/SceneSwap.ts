/**
 * SceneSwap facilitates swapping between scenes
 */
export interface SceneSwap {
  /**
   * Returns the loading progress of this scene.
   * @returns percentage (0 - 1) loaded
   */
  getFractionLoaded() : number;

  /**
   * Swaps in the scene associated with this SceneSwap object.
   */
  swap() : Promise<void>;
}