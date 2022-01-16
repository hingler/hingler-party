import { Nestable } from "./Nestable";

export class NestableBase<T extends NestableBase<T>> implements Nestable<T> {
  private parent: T;
  private children: Set<T>;
  private id: number;

  constructor(id: number) {
    this.parent = null;
    this.children = new Set();
    this.id = id;
  }

  getChildren() {
    return Array.from(this.children);
  }

  getParent() : T {
    // ts freaks out but T 
    return this.parent;
  }

  private findChild(id: number) {
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

  getChild(id: number) {
    return this.findChild(id);
  }

  removeChild(id: number) {
    if (id === this.id) {
      return null;
    }

    for (let child of this.children) {
      if (child.getId() === id) {
        this.children.delete(child);
        child.parent = null;
        return child;
      }
    }

    let child = this.findChild(id);
    if (child) {
      child.parent.removeChild(child.getId());
      child.parent = null;
    }

    return child;
  }

  addChild(elem: T): boolean {
    if (elem.findChild(this.getId())) {
      return false;
    } else {
      if (elem.parent) {
        elem.parent.removeChild(elem.getId());
      }

      // `this` is always a subtype of T
      // crtp means T will inherit nestablebase<T>
      elem.parent = (this as unknown) as T;
      this.children.add(elem);
      return true;
    }
  }

  getId(): number {
    return this.id;
  }
  
  setId(id: number): void {
    this.id = id;
  }
}