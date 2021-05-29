import { Future } from "../Future";
export class FutureImpl<T> implements Future<T> {
  resolved: boolean;
  value: T;
  valuePromise: Promise<void>;

  private res: () => void;
  private rej: () => void;

  constructor() {
    this.resolved = false;
    this.value = null;
    this.valuePromise = new Promise((res, rej) => {
      this.res = res;
      this.rej = rej;
    });
  }

  valid() {
    return (this.resolved === true);
  }

  async wait() : Promise<T> {
    if (this.resolved) {
      return Promise.resolve(this.value);
    } else {
      await this.valuePromise;
      return this.value;
    }
  }

  get() {
    if (this.resolved) {
      return this.value;
    }

    return null;
  }

  setValue(value: T) {
    this.value = value;
    this.resolved = true;
    this.res();
  }
}