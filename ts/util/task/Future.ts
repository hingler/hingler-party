export abstract class Future<T> {
  abstract valid() : boolean;
  abstract wait() : Promise<T>;
  abstract get() : T;

}