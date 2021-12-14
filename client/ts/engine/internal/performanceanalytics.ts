const updatePerf = new Map<string, number>();
const renderPerf = new Map<string, number>();

class PerfDataIterator implements Iterator<[string, number]> {
  private sortedData : Array<[string, number]>;
  private index : number;
  constructor(data: Map<string, number>) {
    this.index = 0;
    this.sortedData = [];
    for (let elem of data) {
      this.sortedData.push(elem);
    }

    this.sortedData.sort((a, b) => b[1] - a[1]);
  }

  next() {
    if (this.index >= this.sortedData.length) {
      return {done: true, value: null};
    }

    return {
      value: [this.sortedData[this.index][0], this.sortedData[this.index][1]] as [string, number],
      done: (++this.index >= this.sortedData.length)
    };
  }
}

export enum Category {
  UPDATE,
  RENDER
};

export function clearPerf() {
  updatePerf.clear();
  renderPerf.clear();
}

export function logPerf(name: string, delta: number, category: Category) {
  const targ = (category === Category.UPDATE ? updatePerf : renderPerf);
  let time = 0;
  if (targ.has(name)) {
    time = targ.get(name);
  }

  targ.set(name, time + delta);
}

export function logUpdate(name: string, delta: number) {
  logPerf(name, delta, Category.UPDATE);
}

export function logRender(name: string, delta: number) {
  logPerf(name, delta, Category.RENDER);
}

export function getDataIterator(category: Category) {
  const targ = (category === Category.UPDATE ? updatePerf : renderPerf);
  return new PerfDataIterator(targ);
}

export function getUpdatePerf() {
  return getDataIterator(Category.UPDATE);
}

export function getRenderPerf() {
  return getDataIterator(Category.RENDER);
}

