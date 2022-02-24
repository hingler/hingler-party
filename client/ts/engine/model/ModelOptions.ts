import { IReadWriteBuffer } from "nekogirl-valhalla/buffer/IReadWriteBuffer";

// standard options for typ procedural models.
export interface ModelOptions<T extends IReadWriteBuffer<T>> {
  geometryBuffer?: BufferOptions<T>,
  indexBuffer?: BufferOptions<T>
};

// buffer options.
export interface BufferOptions<T extends IReadWriteBuffer<T>> {
  buffer: T,
  // byte offset - modified when passed to calls which push data to buffer.
  offset: number
};