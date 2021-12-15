// a shared timer implementation for gpu queries

// ignore this for a bit -- i'll have to drop by again and fix it

import { IDGenerator } from "../../../../../ts/util/IDGenerator";
import { EXT_disjoint_timer_query_webgl2 } from "../../GameContext";
import { RingArray } from "./RingArray";

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

class QueryManager {
  gl: WebGL2RenderingContext;
  ext: EXT_disjoint_timer_query_webgl2;

  query: WebGLQuery;

  constructor(gl: WebGL2RenderingContext, ext: EXT_disjoint_timer_query_webgl2) {
    this.gl = gl;
    this.ext = ext;
    this.query = null;
  }

  private logerr(gl: WebGLRenderingContext) {
    const e = gl.getError();
    if (e !== gl.NO_ERROR) {
      console.error(e);
      debugger;
    }
  }

  private genReadCallback(q: WebGLQuery) {
    const query = q;
    const gl = this.gl;
    const ext = this.ext;
    const that = this;
    return new Promise<number>((res, rej) => {
      function checkStatus() {
        const avail = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
        that.logerr(gl);
        const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
        that.logerr(gl);

        if (avail && !disjoint) {
          const result = gl.getQueryParameter(query, gl.QUERY_RESULT);
          that.logerr(gl);
          gl.deleteQuery(query);
          that.logerr(gl);
          res(result);
        } else if (disjoint) {
          gl.deleteQuery(query);
          that.logerr(gl);
          rej(-1);
        } else {
          setTimeout(checkStatus);
        }
      }

      checkStatus();
    });
  }

  startQuery() {
    this.query = this.gl.createQuery();
    this.gl.finish();
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.query);
    this.gl.finish();
  }

  async stopQuery() {
    this.gl.finish();
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.gl.finish();
    const q = this.query;
    this.query = null;
    return this.genReadCallback(q);
  }
}

// make a consistent interface out of this :(
export class SharedGPUTimer {
  private blockList: RingArray<Block>;
  private gl: WebGL2RenderingContext;
  private ext: EXT_disjoint_timer_query_webgl2;
  
  private gen: IDGenerator;
  
  private word: QueryManager;
  private test: boolean;
  
  constructor(gl: WebGL2RenderingContext, ext?: EXT_disjoint_timer_query_webgl2) {
    this.blockList = new RingArray(4096);
    this.gen = new IDGenerator();
    let extension = ext;
    this.word = new QueryManager(gl, ext);
    this.test = false;
  }
  
  private logerr(gl: WebGLRenderingContext) {
    const e = gl.getError();
    if (e !== gl.NO_ERROR) {
      console.error(e);
      debugger;
    }
  }

  cleanBlockList() {
    // associate startblocks with their endblocks
    // we can delete everything prior to the last startblock whose endblock is unresolved
    
    // block id -> index
    const starts = new Map<number, number>();
    // set of all queryids which have completed!
    const completedQueries = new Set<number>();
    for (let i = 0; i < this.blockList.length; i++) {
      // store startblock indices -- additionally, map them to their endblocks
      // go back through our startblocks in sequence, and find the first one with an unresolved (or nonexistent) end block
      // dequeue everything up to that startblock :D
      const block = this.blockList.get(i);
      if (block.type === BlockType.START) {
        starts.set((block as StartBlock).queryId, i);
      } else if (block.type === BlockType.END) {
        const end = block as EndBlock;
        if (starts.has(end.queryId) && end.resolved) {
          completedQueries.add(end.queryId);
        }
      }
    }

    let lastKeep = this.blockList.length;
    for (let [queryId, index] of starts) {
      if (!completedQueries.has(queryId)) {
        lastKeep = Math.min(index, lastKeep);
      }
    }

    for (let i = 0; i < lastKeep; i++) {
      this.blockList.dequeue();
    }
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
      return Promise.reject(-1);
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
      return Promise.reject(-1);
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

  invalidateAll() {
    // reset state -- called at the end of a frame
    if (this.test === true) {
      const _ = this.word.stopQuery();
    }

    this.test = false;
    this.blockList.clear();
    // anything waiting to resolve, will still resolve!
    // we just want to assume that a query doesn't hang over the start of a frame
  }
}