import { ArrayBufferToString } from "../../../../../ts/util/StringToArrayBuffer";
import { FileLike } from "../FileLike";

export class FileLikeWeb implements FileLike {
  private buffer: ArrayBuffer;
  private bufferPromise: Promise<void>;

  private fail_ : boolean;

  constructor(resp: Response | Promise<Response>) {
    this.buffer = null;
    this.fail_ = false;
    if (resp instanceof Response) {
      if (!resp.ok) {
        this.fail_ = true;
      }

      this.bufferPromise = resp.arrayBuffer().then((r) => {
        this.buffer = r;
      });
    } else {
      this.bufferPromise = resp.then((r) => r.arrayBuffer()).then((r) =>{
        this.buffer = r;
      });
    }
    // assume utf8 for now :(
      this.bufferPromise.catch(r => {
        this.fail_ = true;
      })
  }

  get fail() {
    return this.fail_;
  }

  asString() {
    if (this.buffer === null) {
      return null;
    }

    return ArrayBufferToString(this.buffer);
  }

  asArrayBuffer() {
    // this does not work :/
    // ideally: we would return it as a read only
    return this.buffer;
  }

  async waitUntilReady() {
    await this.bufferPromise;
    return this;
  }

  ready() {
    return (this.buffer !== null);
  }
}