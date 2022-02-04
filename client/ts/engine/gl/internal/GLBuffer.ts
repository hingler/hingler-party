import { DataType } from "nekogirl-valhalla/model/DataType";

export enum BufferTarget {
  ARRAY_BUFFER,
  ELEMENT_ARRAY_BUFFER,
  UNBOUND
};

export enum DrawMode {
  TRIANGLES,
  LINES,
  POINTS
};

export interface GLBufferReadOnly {
  // DATAVIEW WRAPPERS
  getInt8(offset: number) : number;
  getUint8(offset: number) : number;
  getInt16(offset: number, littleEndian?: boolean) : number;
  getUint16(offset: number, littleEndian?: boolean) : number;
  getInt32(offset: number, littleEndian?: boolean) : number;
  getUint32(offset: number, littleEndian?: boolean) : number;
  getFloat32(offset: number, littleEndian?: boolean) : number;
  getFloat32Array(offset: number, num: number) : Float32Array;

  
  /**
   * @returns the size, in bytes, of the underlying buffer.
   */
  size() : number;
}

export interface GLBuffer extends GLBufferReadOnly {
  /**
   * Wrapper for VertexAttribPointer. Binds this buffer as an ARRAY_BUFFER
   *   and reads from its contents.
   * @param location attribute index we wish to bind to.
   * @param components number of components in the desired attribute.
   * @param type type of data stored in attrib.
   * @param normalize whether or not to normalize inputs.
   * @param stride bytes separating entries in buffer.
   * @param offset where to start reading from.
   */
  bindToVertexAttribute(location: number, components: number, type: number, normalize: boolean, stride: number, offset: number) : void;
  
  /**
   * Wrapper for specifying instanced attributes. Binds this buffer as an ARRAY_BUFFER
   * and reads its contents.
   * @param location attribute index we wish to bind to.
   * @param components number of components in the desired attribute.
   * @param type type of data stored in attrib.
   * @param normalize whether or not to normalize inputs.
   * @param stride bytes separating entries in buffer.
   * @param offset where to start reading from.
   * @param divisor the number of times an attribute will be used.
   */
  bindToInstancedVertexAttribute(location: number, components: number, type: number, normalize: boolean, stride: number, offset: number, divisor?: number) : void;
  
  /**
   * Specify a default value for an attribute if none is given.
   * @param location - attribute location in question.
   * @param components - number of components in the desired attribute.
   * @param data - the data we want to give.
   */
  setDefaultAttributeValue(location: number, components: number, ...data: number[]) : void;

  disableVertexAttribute(location: number) : void;

  disableInstancedVertexAttribute(location: number) : void;

  // DATAVIEW WRAPPERS
  setInt8(offset: number, value: number) : void;
  setUint8(offset: number, value: number) : void;
  setInt16(offset: number, value: number, littleEndian?: boolean) : void;
  setUint16(offset: number, value: number, littleEndian?: boolean) : void;
  setInt32(offset: number, value: number, littleEndian?: boolean) : void;
  setUint32(offset: number, value: number, littleEndian?: boolean) : void;
  setFloat32(offset: number, value: number, littleEndian?: boolean) : void;
  setFloatArray(offset: number, arr: ArrayLike<number>, littleEndian?: boolean) : void;

  /**
   * Wrapper for DrawElements. Binds this buffer as an ELEMENT_ARRAY_BUFFER
   *   and reads from its contents.
   * @param offset - byte offset at which we wish to start reading indices.
   * @param count - number of indices to read.
   * @param dataType - storage type for indices.
   * @param mode - draw mode. defaults to GL_TRIANGLES.
   */
  drawElements(offset: number, count: number, dataType: DataType, mode?: DrawMode) : void;

  /**
   * Wrapper for drawElementsInstanced. Binds this buffer as an ELEMENT_ARRAY_BUFFER
   *  and reads from its contents.
   * @param mode - draw mode
   * @param count - number of indices to read
   * @param type - storage type for indices
   * @param offset - byte offset at which we wish to start reading
   * @param primCount - number of instances to consume.
   */
  drawElementsInstanced(mode: DrawMode, count: number, type: DataType, offset: number, primCount: number) : void;
  /**
   * Creates a fresh, unbound GLBuffer from the current one.
   */
  copy() : GLBuffer;

  /**
   * Returns the underlying array buffer.
   * Use in times of great peril.
   */
  arrayBuffer() : ArrayBuffer;
}