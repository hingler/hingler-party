interface ShaderDef {
  val: number | null,
  integer: boolean
};

/**
 *  Handles caching of shader context vars as well as converting them into GLSL preproc defines.
 */
export class ShaderEnv {
  private shaderEnvMap: Map<string, ShaderDef>;
  private shaderEnvDirty: boolean;
  private shaderEnvCache: string;

  constructor() {
    this.shaderEnvMap = new Map();
    this.shaderEnvDirty = false;
    this.shaderEnvCache = "\n";
  }

  /**
   *  Sets a shader environment variable.
   *  @param key - name of the var
   *  @param val - typically a number -- assumed null otherwise
   *  @param integer - optional param indicates if a number should be stored as an integer. default: false
   */ 
  setShaderVar(key: string, val?: any, integer?: boolean) {
    // differentiating ints from floats?
    let defVal = val;
    // ensure bad types dont fuck shit up
    if (typeof val !== "number") {
      defVal = null;
    }
    const res : ShaderDef = {
      "val": defVal,
      integer: (!!integer)
    }

    this.shaderEnvMap.set(key, res);
    this.shaderEnvDirty = true;
  }

  getShaderEnv() {
    if (this.shaderEnvDirty) {
      let cache = "";
      for (let entry of this.shaderEnvMap) {
        const def = entry[1];
        // if int: add floor
        // if float: do a naive tostring and a toFixed(1) -- take the longer of the two
        let line = `#define ${entry[0]}`;
        if (def.val !== null) {
          if (entry[1].integer) {
            line = line.concat(` ${Math.floor(def.val).toString()}`);
          } else {
            // floating point
            const lineP = def.val.toFixed(1);
            const lineV = def.val.toString();
            line = line.concat(` ${(lineP.length > lineV.length ? lineP : lineV)}`);
          }
        }

        cache = cache.concat(`${line}\n`);
      }
      
      this.shaderEnvCache = cache;
      this.shaderEnvDirty = false;
    }

    return this.shaderEnvCache;
  }
}
