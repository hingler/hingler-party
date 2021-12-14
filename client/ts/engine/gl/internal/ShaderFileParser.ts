import { ShaderFileLoader } from "./loaders/ShaderFileLoader";
import { FileLoader } from "../../loaders/FileLoader";
import { GameContext } from "../../GameContext";
import { getEnginePath } from "../../internal/getEnginePath";

const eol = /\r?\n/;

let ver : string = undefined;

const DEFAULT_INCLUDES = [
  "env",
  "attenuation",
  "compatibility",
  "spotlight",
  "ambient",
  "constants",
  "gradient",
  "opensimplex",
  "perlin",
  "pbr",
  "radialblur",
  "random",
  "version"
];

const SPOTLIGHT_INCLUDES = [
  "object",
  "light",
  "pbr"
];


// fix dupe includes on env :(
export class ShaderFileParser {
  private loader: FileLoader;
  private ctx: GameContext;
  private pathRecord: Set<string>;

  constructor(ctx: GameContext) {
    this.loader = ctx.getFileLoader();
    this.ctx = ctx;
    if (ver === undefined) {
      ver = (this.ctx.webglVersion === 2 ? "#version 300 es" : "#version 100");
    }
  }

  async parseShaderFile(path: string, isVertexShader?: boolean) {
    this.pathRecord = new Set();
    return await this.parseShaderFile_(path, !!isVertexShader);
  }

  private async parseShaderFile_(path: string, isVertexShader: boolean) {
    if (this.pathRecord.has(path)) {
      console.info(path + " already included in program. Ignoring import...");
      return "";
    }

    this.pathRecord.add(path);
    const includeHeader = "#include "

    const includeExtract = /\s*#include\s+<(([^\/]+)(\/(.*))?)>.*/
    let contents = await this.loader.open(path);
    let folder = path.substring(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);

    let lines = contents.asString().split(eol);
    let output = [];
    
    for (let line of lines) {
      if (line.indexOf(includeHeader) !== -1) {
        console.info("Encountered new include: " + line);
        let match = includeExtract.exec(line);
        if (match !== null) {
          const name = match[2];
          // note: look for trailing slashes

          if (DEFAULT_INCLUDES.includes(name)) {
            switch (name) {
              case "env":
                output.push(this.ctx.getShaderEnv());
                output.push(`#define VERT ${isVertexShader ? 1 : 0}`);
                break;
              case "attenuation":
                output.push(await this.parseShaderFile_(getEnginePath("engine/glsl/includes/spotlight/attenuation.inc.glsl"), isVertexShader));
                break;
              case "compatibility":
                output.push(await this.parseShaderFile_(getEnginePath("engine/glsl/includes/compatibility.inc.glsl"), isVertexShader));
                break;
              case "spotlight":
                console.log(match);
                
                if (match[4] !== undefined) {
                  if (SPOTLIGHT_INCLUDES.indexOf(match[4]) !== -1) {
                    output.push(await this.parseShaderFile_(getEnginePath(`engine/glsl/includes/spotlight/spotlight_libs/spotlight_${match[4]}.inc.glsl`), isVertexShader))
                  } else {
                    // if not a valid include, treat it as a normal path
                    const relativePath = folder + match[1];
                    output.push(await this.parseShaderFile_(relativePath, isVertexShader));
                  }
                } else {
                  output.push(await this.parseShaderFile_(getEnginePath("engine/glsl/includes/spotlight/spotlight.inc.glsl"), isVertexShader));
                }
                break;
              case "ambient":
                output.push(await this.parseShaderFile_(getEnginePath("engine/glsl/includes/ambient.inc.glsl"), isVertexShader));
                break;
              case "constants":
                output.push(await this.parseShaderFile_(getEnginePath("engine/glsl/includes/constants.inc.glsl"), isVertexShader));
                break;
              case "gradient":
                output.push(await this.parseShaderFile_(getEnginePath("engine/glsl/includes/gradient.inc.glsl"), isVertexShader));
                break;
              case "opensimplex":
                output.push(await this.parseShaderFile_(getEnginePath("engine/glsl/includes/opensimplex.inc.glsl"), isVertexShader));
                break;
              case "perlin":
                output.push(await this.parseShaderFile_(getEnginePath("engine/glsl/includes/perlin.inc.glsl"), isVertexShader));
                break;
              case "pbr":
                output.push(await this.parseShaderFile_(getEnginePath("engine/glsl/includes/pbr.inc.glsl"), isVertexShader));
                break;
              case "radialblur":
                output.push(await this.parseShaderFile_(getEnginePath("engine/glsl/includes/radialblur.inc.glsl"), isVertexShader));
                break;
              case "random":
                output.push(await this.parseShaderFile_(getEnginePath("engine/glsl/includes/random.inc.glsl"), isVertexShader));
                break;
              case "version":
                output.push(ver + "\n");
                break;
            }

            continue;
          } else {
            let relativePath = folder + match[1];
            output.push(await this.parseShaderFile_(relativePath, isVertexShader));
          }
          continue;
        }
      }

      output.push(line);
    }

    return output.join("\n");
  }
}