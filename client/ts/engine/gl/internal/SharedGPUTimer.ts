// a shared timer implementation for gpu queries

// ignore this for a bit -- i'll have to drop by again and fix it

import { IDGenerator } from "../../../../../ts/util/IDGenerator";
import { EXT_disjoint_timer_query_webgl2 } from "../../GameContext";
import { Category, logRender, RenderType } from "../../internal/performanceanalytics";

import { RingArray } from "nekogirl-valhalla/array/RingArray";

let objCount : number = 0;


export enum BlockType {
  INTERVAL,
  START, END
};

export interface Block {
  type: BlockType;
  id: number;
};

export class StartBlock implements Block {
  // unique identifier for a given query
  readonly type : BlockType = BlockType.START;
  id: number;
  queryId: number;
  resolved: boolean;
};

export class EndBlock implements Block {
  // unique identifier for this query, shared with startblock
  readonly type : BlockType = BlockType.END;
  id: number;
  queryId: number;
  resolved: boolean;
};

export class IntervalBlock implements Block {
  // time units passed during this interval block
  readonly type : BlockType = BlockType.INTERVAL;
  id: number;
  time: Promise<number>;
};

class QueryRecord {
  query: WebGLQuery;
  logDest: string;
  resolve: (value: number) => void;
  reject: (value: any) => void;
}

export interface QueryManager {
  // attempts to match values to any waiting queries
  flushQueries() : void;

  // starts a new query
  startQuery() : void;

  /**
   * Stops the last started query
   */
  stopQuery() : Promise<number>;
}

export class QueryManagerWebGL2 implements QueryManager {
  gl: WebGL2RenderingContext;
  ext: EXT_disjoint_timer_query_webgl2;

  query: WebGLQuery;
  queryList: Set<QueryRecord>;

  // alternative: use a pool of timers!!!

  constructor(gl: WebGL2RenderingContext, ext: EXT_disjoint_timer_query_webgl2) {
    this.gl = gl;
    this.ext = ext;
    this.query = null;
    this.queryList = new Set();
  }

  flushQueries() {
    const gl = this.gl;
    const ext = this.ext;
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
    for (let query of this.queryList) {
      const q = query.query;

      if (disjoint) {
        query.reject("Timer query was disjoint :(");
      }

      const avail = gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE);

      if (avail && !disjoint) {
        const result = gl.getQueryParameter(q, gl.QUERY_RESULT);
        query.resolve(result);
      }
      
      if (avail || disjoint) {
        gl.deleteQuery(q);
        this.queryList.delete(query);
      }
    }
  }

  startQuery() {
    this.query = this.gl.createQuery();
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.query);
  }

  async stopQuery() {
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    const q = this.query;
    this.query = null;
    return new Promise<number>((res, rej) => {
      this.queryList.add({
        query: q,
        logDest: null,
        resolve: res,
        reject: rej
      });
    });
  }
}

export interface PerformanceRecord {
  // the interval which this will eventually populate
  intervalId: number;

  // the query itself
  query: WebGLQuery;
}

export interface GPUTimer {
  startQuery() : number;
  stopQuery(id: number) : Promise<number>;
  stopQueryAndLog(id: number, name: string, category?: RenderType) : void;
}

export interface GPUTimerInternal extends GPUTimer {
  invalidateAll() : void;
}

// placeholder if extension is not avail
export class DummyGPUTimer implements GPUTimerInternal {
  startQuery() { return -1; }
  stopQuery(_: number) { return Promise.resolve(0); }
  stopQueryAndLog(_: number, __: string, ___?: RenderType) { /* nop */ }
  invalidateAll() { /* nop */ }
}

// webgl2 gpu timer
export class SharedGPUTimer implements GPUTimerInternal {
  private blockList: RingArray<Block>;
  
  private gen: IDGenerator;
  
  private word: QueryManager;
  private test: boolean;
  
  constructor(mgr: QueryManager) {
    this.blockList = new RingArray(4096);
    this.gen = new IDGenerator();
    this.word = mgr;
    this.test = false;
  }

  getLastBlockAsIntervalBlock() {
    const res = this.blockList.get(this.blockList.length - 1);
    if (res.type !== BlockType.INTERVAL) {
      throw Error("END OF LIST IS NOT INTERVAL");
    }

    return res as IntervalBlock;
  }

  // stops the last query, and places its eventual result in the last interval block

  // starts a new GPU query.
  // returns an identifier which can be used to stop the query later.
  startQuery() {
    if (this.test === true) {
      const prom = this.word.stopQuery();
      this.getLastBlockAsIntervalBlock().time = prom;
    }

    this.word.startQuery();
    this.test = true;

    const id = this.gen.getNewID();
    const start = new StartBlock();

    start.id = this.gen.getNewID();

    start.queryId = id;
    start.resolved = false;
    
    this.blockList.push(start);
    
    const interval = new IntervalBlock();
    interval.time = null;
    this.blockList.push(interval);

    return id;
  }

  async stopQuery(queryId: number) : Promise<number> {
    if (this.test === false) {
      return Promise.reject("No query was available");
    }
    
    let marker = -1;
    for (let i = 0; i < this.blockList.length; i++) {
      const block = this.blockList.get(i);
      if (block.type === BlockType.START) {
        const start = block as StartBlock;
        if (start.queryId === queryId) {
          marker = i;
        }
      }
    }
    
    if (marker === -1) {
      // end query flag does not exist
      return Promise.reject("Uh oh!!! Your ID is bad >:)");
    }
    
    const prom = this.word.stopQuery();
    this.getLastBlockAsIntervalBlock().time = prom;

    this.word.startQuery();

    const endBlock = new EndBlock();
    endBlock.queryId = queryId;
    endBlock.resolved = false;
    this.blockList.push(endBlock);

    const intervals : Array<Promise<number>> = [];
    for (let i = marker; i < this.blockList.length; i++) {
      const block = this.blockList.get(i);
      if (block.type === BlockType.INTERVAL) {
        intervals.push((block as IntervalBlock).time);
      }
    }

    const sumPromise = Promise.all(intervals).then((times) => {
      let res = 0;
      for (const time of times) {
        res += time;
      }

      return res;
    }).then(sum => {
      endBlock.resolved = true;
      return sum;
    });

    // push the interval to the end of the blocklist
    this.blockList.push(endBlock);

    const interval = new IntervalBlock();
    interval.time = null;
    this.blockList.push(interval);

    return sumPromise;
  }

  stopQueryAndLog(id: number, name: string, category?: RenderType) {
    this.stopQuery(id)
      .then(res => logRender(name, res / 1e6, category));
  }

  invalidateAll() {
    // reset state -- called at the end of a frame
    if (this.test === true) {
      const _ = this.word.stopQuery();
    }

    this.test = false;
    this.blockList.clear();

    // flush out our queue
    this.word.flushQueries();
  }
}