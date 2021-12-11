import {Task} from "../../../../../ts/util/task/Task";
import {GameContext} from "../../GameContext";
import {FileLike} from "../../loaders/FileLike";
import {SamplingMode, Texture, TextureFormat} from "../Texture";

// todo: come up with a better system for managing gl extensions
// might be a global that our engine pulls
// then we can look them up on the fly instead of storing them all over the place ;(

export class HDRTexture extends Texture {
  private dims_: [number, number];
  private tex: WebGLTexture;
  private ctx: GameContext;

  readonly uintTexture: boolean;
  
  private loadTask: Task<void>;

  constructor(ctx: GameContext, path: string) {
    super();
    this.tex = null;
    this.ctx = ctx;
    const gl = this.ctx.getGLContext();
    
    this.uintTexture = !(ctx.getGLExtension("OES_texture_float") !== null && ctx.getGLExtension("OES_texture_float_linear") !== null);

    this.loadTask = new Task();
    this.ctx.getFileLoader().open(path)
      .then(HDRTexture.loadHDRImageFromFile)
      .then(this.finalizeImageTexture.bind(this))
      .then(() => this.loadTask.resolve());
    // load file from file loader
    // write a method to parse its contents
  }

  get dims() : [number, number] {
    return [this.dims_[0], this.dims_[1]];
  }

  async waitUntilUploaded() {
    await this.loadTask.getFuture().wait();
  }

  setSamplingMode(mode: SamplingMode) {
    return this.handleTextureSampling(this.tex, this.ctx.getGLContext(), mode);
  }

  getTextureFormat() {
    return TextureFormat.RGB;
  }

  bindToUniform(location: WebGLUniformLocation, index: number) {
    const gl = this.ctx.getGLContext();
    if (index > 31 || index < 0) {
      console.error("OOB index");
      throw Error("OOB index");
    }

    // todo: calling shader draw before texture is loaded!?
    if (this.tex !== null) {
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.uniform1i(location, index);
    } else {
      console.log("oops");
    }
  }

  private finalizeImageTexture(res: [Float32Array, [number, number]]) {
    // if float textures arent supported, we need to convert res back to a float
    if (this.uintTexture) {
      console.warn("Platform does not support floating point textures. Converting to uint...");
      // this does nothing right now im just going to ignore it while i try to get this working
    }

    let data = res[0];
    let dims = res[1];

    const gl = this.ctx.getGLContext();

    this.dims_ = dims;

    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, dims[1], dims[0], 0, gl.RGB, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  private static loadHDRImageFromFile(img: FileLike) : [Float32Array, [number, number]] {
    const buf = new Uint8Array(img.asArrayBuffer());
    // lol
    const magic = String.fromCharCode(...buf.slice(0, 11));
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
        const line : string = String.fromCharCode(...buf.slice(lineStart, cur - 1));
        console.log(line);
        if (line.indexOf("FORMAT=") !== -1) {
          format = line.substring(7);
          if (format !== "32-bit_rle_rgbe") {
            // cant handle this encoding type yet
            console.error("Unable to handle format " + format);
            return null;
          }
        }

        // cur advanced past first newline -- on first char of next line
        lineStart = cur;

        if (buf[cur] === 0x0A) {
          break;
        }
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
    const resString = String.fromCharCode(...buf.slice(lineStart, cur - 1));
    const m : Array<string> = resString.match(resRegex);
    console.log(m);
    
    if (m === null) {
      console.error("Could not interpret resolution string: " + resString);
      return null;
    }

    console.log(m);

    const highDim = Number.parseInt(m[1].split(" ")[1], 10);
    const lowDim  = Number.parseInt(m[2].split(" ")[1], 10);
    console.log(highDim);
    console.log(lowDim);
    // allocate * 4 and then return a slice?
    // doing the function call so many times is costly, this avoids code reuse in exchange for a larger mem footprint
    // we only do this a couple times and then dealloc the result once its on the gpu so its fine
    const int = new Uint8Array(highDim * lowDim * 4);
    const res = new Float32Array(highDim * lowDim * 3);

    // read (highdim) lines of length (lowdim)
    for (let i = 0; i < highDim; i++) {
      cur = HDRTexture.readLine(buf, cur, int, (i * lowDim * 4), lowDim);
    }

    // int contains pixel data
    let inputOffset = 0;
    let outputOffset = 0;
    let r: number, g: number, b: number, e: number;
    for (let i = 0; i < highDim; i++) {
      for (let j = 0; j < lowDim; j++) {
        r = int[inputOffset++];
        g = int[inputOffset++];
        b = int[inputOffset++];
        e = int[inputOffset++];
        const pow = Math.pow(2, (e - 128));
        res[outputOffset++] = ((r + 0.5) / 256) * pow;
        res[outputOffset++] = ((g + 0.5) / 256) * pow;
        res[outputOffset++] = ((b + 0.5) / 256) * pow;
      }
    }

    return [res, [highDim, lowDim]];
  }

  /**
   * Reads a single scanline of our file.
   * @param file - Uint8Array containing our file.
   * @param offset - file offset which we will start reading at.
   * @param out - float32array we will output the result to.
   * @param outOffset - location where we should start writing to `out`.
   * @param len - length of the scanline remaining to read
   */
  private static readLine(file: Uint8Array, offset: number, out: Uint8Array, outOffset: number, len: number) {
    // new lines: (2, 2, [16 bit lowdim]), code byte, then pixel data for (codebyte & 127) bytes -- colors are separated, and each is ARLE encoded on its own
    // old lines: 1,1,1,(repeat) - duplicate last pixel
    // raw: neither

    let r: number, g: number, b: number, e: number;
    let fileOffset = offset;
    let arrayOffset = outOffset;

    r = file[fileOffset++];
    g = file[fileOffset++];
    b = file[fileOffset++];
    e = file[fileOffset++];
    // r = 2 and g = 2 is new format, scan len is capped at 128 so check the blue channel as well
    if (r !== 2 || g !== 2 || (b & 128)) {
      fileOffset -= 4;
      // could be repeat char i didnt check lol
      return HDRTexture.readLineOldRLE(file, fileOffset, out, arrayOffset, len);
    }

    const lenCheck = (b << 8 | e);
    if (lenCheck !== len) {
      const err = "Invalid scanline length on HDR file!";
      console.error(err);
      throw Error(err);
    }

    return HDRTexture.readLineARLE(file, fileOffset, out, arrayOffset, len);
  }


  /**
   * Reads a line with adaptive RLE encoding.
   * @param file - Uint8Array containing our file.
   * @param offset - file offset which we will start reading at.
   * @param out - float32array we will output the result to.
   * @param outOffset - location where we should start writing to `out`.
   * @param len - length of the scanline remaining to read
   * 
   * @returns the file offset after performing operations.
   */
  private static readLineARLE(file: Uint8Array, offset: number, out: Uint8Array, outOffset: number, len: number) {
    let code: number;
    let fileOffset = offset;
    let arrayOffset = outOffset;
    let repeatCount: number;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < len; ) {
        // read code byte
        code = file[fileOffset++];
        // if > 128, repeat the next value over the col channel
        if (code > 128) {
          repeatCount = code & 127;
          while (repeatCount--) {
            out[arrayOffset + (4 * j++) + i] = file[fileOffset];
          }

          fileOffset++;
        } else {
          while (code--) {
            out[arrayOffset + (4 * j++) + i] = file[fileOffset++];
          }
        }
      }
    }

    return fileOffset;
  }

  /**
   * Reads a line with old RLE encoding.
   * @param file - Uint8Array containing our file.
   * @param offset - file offset which we will start reading at.
   * @param out - float32array we will output the result to.
   * @param outOffset - location where we should start writing to `out`.
   * @param len - length of the scanline remaining to read
   * 
   * @returns the file offset after performing operations
   */
  private static readLineOldRLE(file: Uint8Array, offset: number, out: Uint8Array, outOffset: number, len: number) {
    let r: number, g: number, b: number, e: number;
    let fileOffset = offset;
    let arrayOffset = outOffset;
    let repeatOffset = 0;
    for (let i = 0; i < len; i++) {
      r = file[fileOffset++];
      g = file[fileOffset++];
      b = file[fileOffset++];
      e = file[fileOffset++];

      if (r === 1 && g === 1 && b === 1) {
        const arrayAnchor = arrayOffset - 4;
        e <<= repeatOffset;
        while (e--) {
          for (let j = 0; j < 4; j++) {
            out[arrayOffset++] = out[arrayAnchor + j];
          }
        }

        // if consecutive repeat pixels, higher order bits (duplicating prev still works :3)
        repeatOffset += 8;
      } else {
        out[arrayOffset++] = r;
        out[arrayOffset++] = g;
        out[arrayOffset++] = b;
        out[arrayOffset++] = e;
        repeatOffset = 0;
      }
    }

    return fileOffset;
  }
}
