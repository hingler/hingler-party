// should our sampler manage multiple tiles??
// note : under tile format, we should see the exact same values along borders (slight redundancy -- whatever ig)

// use interface
export class TerrainTile {
  private data: Array<number>;
  readonly res: number;

  /**
   * Creates a new TerrainTile object.
   * @param data - per-vertex terrain data, top-left first and reading per-row, top to bottom.
   * @param res - the resolution of this terrain tile, as a single number. data.length must be at least res * res.
   */
  constructor(data: Uint16Array, res: number) {
    if (res < 0) {
      throw Error("Invalid resolution parameter!");
    }

    if (data.length < res * res) {
      throw Error("Not enough data provided to TerrainTile ctor!");
    }

    this.data = Array.from(data);
    for (let i = 0; i < this.data.length; i++) {
      // consider height here?
      // mipmapping relies on discrete height values, but breaks in certain conditions
      // alternatively: we can mipmap in float space (memory cost but fine)

      // leave it as a uint16?
      // thinking that using uint16s ensures that our data converts losslessly
      this.data[i] /= 65535;
    }

    this.res = res;
  }

  /**
   * Fetches the height of this tile, on a range from 0 to 1.
   * @param x 
   * @param y 
   * @returns 
   */
  getHeight(x: number, y: number) {
    const effX = Math.round(x);
    const effY = Math.round(y);
    if (effX < 0 || effX >= this.res || effY < 0 || effY >= this.res) {
      return null;
    }

    return this.data[y * this.res + x];
  }

  setHeight(x: number, y: number, h: number) {
    const effX = Math.round(x);
    const effY = Math.round(y);
    if (effX < 0 || effX >= this.res || effY < 0 || effY >= this.res) {
      return null;
    }

    // set in our constrained space? actually this makes sense
    this.data[y * this.res + x] = Math.floor(Math.max(Math.min(h, 1), 0) * 65535) / 65535;
  }
}