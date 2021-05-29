// stores reference to index inside of array buffer
// https://github.com/KhronosGroup/glTF/issues/1198
// no stride on indices, but we still need a way to define them.
export interface GLIndex {

  readonly offset: number;
  readonly type: number;
  readonly count: number;

  /**
   * @param offset the ordinality of the index we are fetching
   * @returns the index we fetched.
   */
  getIndex(offset: number): number;

  [Symbol.iterator]() : Iterator<number>;

  /**
   *  Draws all presently bound attributes with the indices specified in this index.
   */
  draw(): void;

  drawInstanced(count: number): void;

  
}