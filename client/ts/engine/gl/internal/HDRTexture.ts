import {Task} from "../../../../../ts/util/task/Task";
import {GameContext} from "../../GameContext";
import {FileLike} from "../../loaders/FileLike";
import {Texture} from "../Texture";

let floatExtension : OES_texture_float = undefined;

// todo: come up with a better system for managing gl extensions
// might be a global that our engine pulls
// then we can look them up on the fly instead of storing them all over the place ;(

export class HDRTexture extends Texture {
  private dims_: [number, number];
  private tex: WebGLTexture;
  private ctx: GameContext;
  
  private loadTask: Task<Float32Array>;

  constructor(ctx: GameContext, path: string) {
    super();
    this.ctx = ctx;
    if (floatExtension === undefined) {
      floatExtension = this.ctx.getGLContext().getExtension("OES_texture_float");
    }
    this.loadTask = new Task();
    this.ctx.getFileLoader().open(path).then(HDRTexture.loadHDRImageFromFile).then(this.loadTask.resolve.bind(this.loadTask));
    // load file from file loader
    // write a method to parse its contents
  }

  private static loadHDRImageFromFile(img: FileLike) : Float32Array {
    const buf = new Uint8Array(img.asArrayBuffer());
    // lol
    const magic = String.fromCharCode.call(String, buf.slice(0, 11));
    if (magic !== "#?RADIANCE\n") {
      // bad magic
      console.error("Magic number inside file not consistent with HDR");
      return null;
    }

    // index of the first char in our header
    let lineStart = 11;
    let cur = lineStart;
    let char : number;
    let format: string = null;
    while (true) {
      char = buf[cur];
      cur++;
      if (char === 0x0A) { // hex \n
        if (buf[cur] === 0x0A) {
          break;
        }

        const line : string = String.fromCharCode.call(String, buf.slice(lineStart, cur - 1));
        if (line.indexOf("FORMAT=") !== -1) {
          format = line.substring(7);
          if (format !== "32_bit_rle_rgbe") {
            // cant handle this encoding type yet
            console.error("Unable to handle format " + format);
            return null;
          }
        }

        // cur advanced past first newline -- on first char of next line
        lineStart = cur;
      }
    }

    // cur is at the second newline after header -- advance to get to res
    lineStart = ++cur;

    if (format === null) {
      // format was never defined
      console.error("Internal file format unknown!");
      return null;
    }

    // read up to the next newline to consume resolution info
    while (true) {
      char = buf[cur];
      cur++;
      if (char === 0x0A) {
        break;
      }
    }

    // cur is now past the newline, on our data

    const resRegex = /([\+\-][XY] [0-9]+) ([\+\-][XY] [0-9]+)/;
    const resString = String.fromCharCode.call(String, buf.slice(lineStart, cur - 1));
    const m : Array<string> = resString.match(resRegex);
    
    if (m === null) {
      console.error("Could not interpret resolution string: " + resString);
      return null;
    }

    const highDim = Number.parseInt(m[0].split("\n")[1], 10);
    const lowDim  = Number.parseInt(m[1].split("\n")[1], 10);
    const res = new Float32Array(highDim * lowDim * 3);
    let r, g, b, e;
    // note: we have to flip the y coordinate if its y-
    // image will be flipped it will be fun!
    for (let i = 0; i < highDim; i++) {
      for (let j = 0; j < lowDim; j++) {
        // 3 * (lowdim * i + j)
        r = buf[cur++];
        g = buf[cur++];
        b = buf[cur++];
        e = buf[cur++];
        
        // r2 g2: illegal
        // r1 g1 b1: illegal
      }
    }
  }
}
