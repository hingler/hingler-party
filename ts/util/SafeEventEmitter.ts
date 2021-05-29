export class SafeEventEmitter {
  callbacks: Map<string, Set<(...args: any) => void>>;

  constructor() {
    this.callbacks = new Map();
  }

  on(event: string, callback: (...args: any) => void) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }

    this.callbacks.get(event).add(callback);
  }

  emit(event: string, ...args: any) {
    let funcs = this.callbacks.get(event);
    if (funcs) {
      for (let func of funcs) {
        func(...args);
      }
    }
  }

  remove(event: string, callback: (...args: any) => void) : boolean {
    let funcs = this.callbacks.get(event);
    if (!funcs) {
      return false;
    }

    return funcs.delete(callback);
  }

  once(event: string, callback: (...args: any) => void) {
    let callbackWrap = (...args: any) => {
      callback(...args);
      this.remove(event, callbackWrap);
    }

    this.on(event, callbackWrap);
  }
}