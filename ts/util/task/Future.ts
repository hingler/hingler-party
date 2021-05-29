export interface Future<T> {
  valid() : boolean;
  wait() : Promise<T>;
  get() : T;

}