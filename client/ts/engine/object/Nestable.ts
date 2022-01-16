/**
 * Used to implement hierarchical structures for components
 * with integer IDs.
 * 
 * Note: we don't want to let implementers add children to armatures.
 * We'll expose a limited spec from armature, and the internal type will allow children.
 */
export interface Nestable<T> {
  getChildren() : Array<T>;
  getParent() : Nestable<T>;
  getChild(id: number) : T;
  removeChild(id: number) : T;
  addChild(elem: T) : boolean;

  // @returns this object's tree-scoped unique ID.
  getId() : number;
  setId(id: number) : void;
}