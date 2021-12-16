import { PingQueue } from "../../../../ts/util/PingQueue";
import { EngineContext } from "./EngineContext";
import { getEnginePath } from "./getEnginePath";
import { getRenderPerf, RenderType } from "./performanceanalytics";
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

const MAX_NUMBER_BARS = 24;
const DEBUG_QUEUE_SIZE = 128;

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

  private renderbarsContainer: HTMLElement;
  private renderBars: Array<HTMLElement>;

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

    const renderBars = document.createElement("div");
    renderBars.classList.add("renderbars");
    this.frame.appendChild(renderBars);
    document.body.appendChild(this.frame);
    this.renderbarsContainer = renderBars;
    this.renderBars = [];

    this.updateTime = 0;
    this.shadowTime = 0;
    this.finalTime = 0;
    this.postTime = 0;
    this.totalTime = 0;
  }

  private generateRenderBar() {
    const bar = document.createElement("div");
    bar.classList.add("bar");
    return bar;
  }

  update() {
    if (!this.ctx.debugger) {
      return;
    }

    const perf = getRenderPerf();
    const len = Math.min(perf.length, MAX_NUMBER_BARS);
    while (this.renderBars.length < len) {
      const bar = this.generateRenderBar();
      this.renderbarsContainer.appendChild(bar);
      this.renderBars.push(bar);
    }

    let max = 0;
    for (let val of perf) {
      max = Math.max(val[1], max);
    }

    for (let i = 0; i < len; i++) {
      const res = perf.get(i);
      this.renderBars[i].style.width = (res[1] / max) * 100 + "%";
      const name = res[0];
      const ind = name.indexOf(":");
      const type = name.substring(0, ind);
      this.renderBars[i].classList.remove(RenderType.FINAL, RenderType.POST, RenderType.SHADOW, RenderType.UNCATEGORIZED);
      this.renderBars[i].classList.add(type);
      this.renderBars[i].textContent = `${res[0]} - ${res[1].toFixed(3)}MS`;

      
      this.renderBars[i].classList.remove("hidden");
    }

    for (let i = len; i < this.renderBars.length; i++) {
      this.renderBars[i].classList.add("hidden");
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