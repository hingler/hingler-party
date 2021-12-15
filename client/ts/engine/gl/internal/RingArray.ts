export class RingArray<T> {
  private elements: Array<T>;
  private size: number;
  private offset: number;
  readonly capacity: number;

  constructor(len: number) {
    this.elements = new Array(len);
    this.capacity = len;
    this.size = 0;
    this.offset = 0;
  }

  get length() {
    return this.size;
  }

  push(item: T) {
    if (this.size >= this.elements.length) {
      throw Error("Exceeded ringbuffer capacity");
    }

    this.elements[(this.offset + this.size++) % this.elements.length] = item;
  }

  pop() {
    if (this.size <= 0) {
      return undefined;
    }

    return this.elements[(this.offset + --this.size) % this.elements.length];
  }

  dequeue() : T {
    const res = this.elements[this.offset];
    this.offset = (this.offset + 1) % this.elements.length;
    this.size--;
    return res;
  }

  get(ind: number) {
    if (ind >= this.size) {
      return undefined;
    }

    return this.elements[(this.offset + ind) % this.elements.length];
  }

  clear() {
    this.offset = 0;
    this.size = 0;
  }
}