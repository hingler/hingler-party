import { Nestable } from "./Nestable";

// helper class to assist with nesting
export class NestingManager<T extends Nestable<T>> {
  private children: Set<T>;
  private selfId: number;

  constructor(selfId: number) {
    this.children = new Set();
    this.selfId = selfId;
  }

  setId(id: number) {
    this.selfId = id;
  }

  getChildren() {
    return Array.from(this.children);
  }

  findChild(id: number) {
    let res: T = null;
    for (let child of this.children) {
      if (child.getId() === id) {
        res = child;
        break;
      }
    }


    if (res === null) {
      for (let child of this.children) {
        res = child.getChild(id);
      }
    }

    return res;
  }

  addChild(child: T) {
    this.children.add(child);
  }

  removeChild(id: number) {
    const child = this.findChild(id);
    if (child !== null) {
      this.children.delete(child);
    }

    return child;
  }
}