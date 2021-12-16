import { PingQueue } from "../../../../ts/util/PingQueue";

const updatePerf = new Map<string, number>();
const renderPerf = new Map<string, number>();

const renderQueue = new Map<string, PingQueue>();
const updateQueue = new Map<string, PingQueue>();

const SAMPLES_PER_QUEUE = 128;

class PerfData {
  private sortedData: Array<[string, number]>;
  
  constructor(data: Map<string, PingQueue>) {
    this.sortedData = [];
    for (let elem of data) {
      this.sortedData.push([elem[0], elem[1].getAverage()]);
    }

    this.sortedData.sort((a, b) => b[1] - a[1]);
    this.sortedData = this.sortedData.filter((val) => val[1] > 0);
  }

  get length() {
    return this.sortedData.length;
  }

  get(ind: number) {
    return this.sortedData[ind];
  }

  [Symbol.iterator]() {
    return new PerfDataIterator(this.sortedData);
  }
}

class PerfDataIterator implements Iterator<[string, number]> {
  private sortedData : Array<[string, number]>;
  private index : number;
  constructor(sortedData: Array<[string, number]>) {
    this.sortedData = sortedData;
    this.index = 0;
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

export enum RenderType {
  SHADOW = "shadow",
  FINAL = "final",
  POST = "post",
  UNCATEGORIZED = "uncategorized"
};

export function clearPerf() {
  const perfs : Array<[Map<string, number>, Map<string, PingQueue>]> = [
    [updatePerf, updateQueue],
    [renderPerf, renderQueue]
  ];
  
  for (let [perf, queueMap] of perfs) {
    for (let [name, delta] of perf) {
      let queue: PingQueue;
      if (!queueMap.has(name)) {
        queue = new PingQueue(SAMPLES_PER_QUEUE);
        queueMap.set(name, queue);
      } else {
        queue = queueMap.get(name);
      }

      queue.enqueue(delta);

      // if we haven't queued up a value for something which definitely has a pingqueue, then wipe it
    }

    for (let name of queueMap.keys()) {
      if (!perf.has(name)) {
        // wasn't updated -- no render, so push a 0
        queueMap.get(name).enqueue(0);
      }
    }
  }

  updatePerf.clear();
  renderPerf.clear();
}

function logPerf(name: string, delta: number, category: Category) {
  const targ = (category === Category.UPDATE ? updatePerf : renderPerf);
  let time = 0;
  if (targ.has(name)) {
    time = targ.get(name);
  }

  targ.set(name, time + delta);
}

// todo: add some color tagging
// quickly differentiate shadows from draws from postrenders

export function logUpdate(name: string, delta: number) {
  logPerf(name, delta, Category.UPDATE);
}

export function logRender(name: string, delta: number, type?: RenderType) {
  const rendertype = (type !== undefined ? type : RenderType.UNCATEGORIZED);
  
  logPerf(`${rendertype}::${name}`, delta, Category.RENDER);
}

function getData(category: Category) {
  const targ = (category === Category.UPDATE ? updateQueue : renderQueue);
  return new PerfData(targ);
}

export function getUpdatePerf() {
  return getData(Category.UPDATE);
}

export function getRenderPerf() {
  return getData(Category.RENDER);
}

