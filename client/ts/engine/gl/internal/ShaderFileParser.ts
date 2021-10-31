import { ShaderFileLoader } from "./loaders/ShaderFileLoader";
import { FileLoader } from "../../loaders/FileLoader";
import { GameContext } from "../../GameContext";
import { getEnginePath } from "../../internal/getEnginePath";

const eol = /\r?\n/;

const DEFAULT_INCLUDES = [
  "env",
  "attenuation",
  "spotlight",
  "ambient",
  "constants",
  "gradient",
  "opensimplex",
  "perlin",
  "pbr",
  "radialblur"
]

export class ShaderFileParser {
  private loader: FileLoader;
  private ctx: GameContext;
  private pathRecord: Set<string>;

  constructor(ctx: GameContext) {
    this.loader = ctx.getFileLoader();
    this.ctx = ctx;
  }

  async parseShaderFile(path: string) {
    this.pathRecord = new Set();
    return await this.parseShaderFile_(path);
  }

  private async parseShaderFile_(path: string) {
    if (this.pathRecord.has(path)) {
      console.info(path + " already included in program. Ignoring import...");
      return "";
    }

    this.pathRecord.add(path);
    const includeHeader = "#include "
    const includeExtract = /\s*#include\s+<?(.*)>.*/
    let contents = await this.loader.open(path);
    let folder = path.substring(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);

    let lines = contents.asString().split(eol);
    let output = [];
    
    for (let line of lines) {
      if (line.indexOf(includeHeader) !== -1) {
        console.info("Encountered new include: " + line);
        let match = includeExtract.exec(line);
        if (match !== null) {
          const name = match[1];
          if (DEFAULT_INCLUDES.includes(name)) {
            switch (name) {
              case "env":
                output.push(this.ctx.getShaderEnv());
                break;
              case "attenuation":
                output.push(await this.parseShaderFile(getEnginePath("engine/glsl/includes/spotlight/attenuation.inc.glsl")));
                break;
              case "spotlight":
                output.push(await this.parseShaderFile(getEnginePath("engine/glsl/includes/spotlight/spotlight.inc.glsl")));
                break;
              case "ambient":
                output.push(await this.parseShaderFile(getEnginePath("engine/glsl/includes/ambient.inc.glsl")));
                break;
              case "constants":
                output.push(await this.parseShaderFile(getEnginePath("engine/glsl/includes/constants.inc.glsl")));
                break;
              case "gradient":
                output.push(await this.parseShaderFile(getEnginePath("engine/glsl/includes/gradient.inc.glsl")));
                break;
              case "opensimplex":
                output.push(await this.parseShaderFile(getEnginePath("engine/glsl/includes/opensimplex.inc.glsl")));
                break;
              case "perlin":
                output.push(await this.parseShaderFile(getEnginePath("engine/glsl/includes/perlin.inc.glsl")));
                break;
              case "pbr":
                output.push(await this.parseShaderFile(getEnginePath("engine/glsl/includes/pbr.inc.glsl")));
                break;
              case "radialblur":
                output.push(await this.parseShaderFile(getEnginePath("engine/glsl/includes/radialblur.inc.glsl")));
                break;
            }

            continue;
          } else {
            let relativePath = folder + match[1];
            output.push(await this.parseShaderFile(relativePath));
          }
          continue;
        }
      }

      output.push(line);
    }

    return output.join("\n");
  }
}