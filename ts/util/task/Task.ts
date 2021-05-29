import { Future } from "./Future";
import { FutureImpl } from "./internal/FutureImpl";

export class Task<T> {
  future: FutureImpl<T>;
  
  constructor() {
    this.future = new FutureImpl();
  }

  getFuture() : Future<T> {
    return this.future;
  }

  resolve(value: T) {
    this.future.setValue(value);
  }
}