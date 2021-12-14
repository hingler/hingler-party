import { PingQueue } from "../../../../ts/util/PingQueue";
import { EngineContext } from "./EngineContext";
import { getEnginePath } from "./getEnginePath";
import { RenderPerformanceInfo } from "./Renderer";

function text(s: string) {
  return document.createTextNode(s);
}

function span() {
  return document.createElement("span");
}

function br() {
  return document.createElement("br");
}

const DEBUG_QUEUE_SIZE = 64;

/**
 * Little class for displaying debug information on the screen :D
 */
export class DebugDisplay {
  private ctx: EngineContext;

  private frame: HTMLElement;

  private updateTimeSpan: HTMLElement;
  private shadowTimeSpan: HTMLElement;
  private finalTimeSpan: HTMLElement;
  private postTimeSpan: HTMLElement;
  private totalTimeSpan: HTMLElement;

  private updateQueue: PingQueue;
  private shadowQueue: PingQueue;
  private finalQueue: PingQueue;
  private postQueue: PingQueue;
  private totalQueue: PingQueue;

  updateTime: number;
  shadowTime: number;
  finalTime: number;
  postTime: number;
  totalTime: number;

  constructor(ctx: EngineContext) {
    this.ctx = ctx;

    ctx.getFileLoader().open(getEnginePath("engine/css/debug.css"))
      .then(res => {
        const style = document.createElement("style");
        style.textContent = res.asString();
        document.head.appendChild(style);   
      });

    this.frame = document.createElement("div");
    this.frame.classList.add("debug-frame");

    this.updateTimeSpan = span();
    this.shadowTimeSpan = span();
    this.finalTimeSpan = span();
    this.postTimeSpan = span();
    this.totalTimeSpan = span();

    this.updateQueue = new PingQueue(DEBUG_QUEUE_SIZE);
    this.shadowQueue = new PingQueue(DEBUG_QUEUE_SIZE);
    this.finalQueue = new PingQueue(DEBUG_QUEUE_SIZE);
    this.postQueue = new PingQueue(DEBUG_QUEUE_SIZE);
    this.totalQueue = new PingQueue(DEBUG_QUEUE_SIZE);

    const general = document.createElement("p");
    general.appendChild(text("UPDATE: "));
    general.appendChild(this.updateTimeSpan);
    general.appendChild(br());
    general.appendChild(text("RENDER: "));
    general.appendChild(this.totalTimeSpan);
    
    const renderdata = document.createElement("p");
    renderdata.appendChild(text("RENDER INFO: "));
    renderdata.appendChild(br());
    renderdata.appendChild(text("SHADOW: "));
    renderdata.appendChild(this.shadowTimeSpan);
    renderdata.appendChild(br());
    renderdata.appendChild(text("FINAL: "));
    renderdata.appendChild(this.finalTimeSpan);
    renderdata.appendChild(br());
    renderdata.appendChild(text("POST: "));
    renderdata.appendChild(this.postTimeSpan);

    this.frame.appendChild(general);
    this.frame.appendChild(renderdata);
    document.body.appendChild(this.frame);

    this.updateTime = 0;
    this.shadowTime = 0;
    this.finalTime = 0;
    this.postTime = 0;
    this.totalTime = 0;
  }

  update() {
    if (this.updateTime === undefined) {
      console.log(this);
    }

    this.updateQueue.enqueue(this.updateTime);
    this.shadowQueue.enqueue(this.shadowTime);
    this.finalQueue.enqueue(this.finalTime);
    this.postQueue.enqueue(this.postTime);
    this.totalQueue.enqueue(this.totalTime);

    if (this.ctx.debugger) {
      this.frame.classList.remove("hidden");
      this.updateTimeSpan.textContent = (`${this.updateQueue.getAverage().toFixed(3)}MS`);
      this.shadowTimeSpan.textContent = (`${this.shadowQueue.getAverage().toFixed(3)}MS`);
      this.finalTimeSpan.textContent = (`${this.finalQueue.getAverage().toFixed(3)}MS`);
      this.postTimeSpan.textContent = (`${this.postQueue.getAverage().toFixed(3)}MS`);
      this.totalTimeSpan.textContent = (`${this.totalQueue.getAverage().toFixed(3)}MS`);
    } else {
      this.frame.classList.add("hidden");
    }
  }
}