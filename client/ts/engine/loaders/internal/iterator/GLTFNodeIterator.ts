import { GLTFNodeReadOnly } from "../gltfTypes";

export class GLTFNodeIterator implements IterableIterator<GLTFNodeReadOnly> {
  private arr: ReadonlyArray<GLTFNodeReadOnly>;
  private ind: number;
  constructor(arr: ReadonlyArray<GLTFNodeReadOnly>) {
    this.arr = arr;
    this.ind = 0;
  }  

  [Symbol.iterator]() { return this; }

  next() : IteratorResult<GLTFNodeReadOnly> {
    if (this.ind >= this.arr.length || !this.arr) {
      return {
        done: true,
        value: null
      };
    }

    return {
      done: false,
      value: this.arr[this.ind++]
    };
  }
}