import { ReadonlyVec2, ReadonlyVec3, ReadonlyVec4, vec2, vec3, vec4 } from "gl-matrix";
import { GameContext } from "../../GameContext";
import { FileLike } from "../FileLike";

export class OBJFileData {
  private filePromise: Promise<void>;

  private faces_: Array<Array<string>>;

  private lines_: Array<[number, number]>;

  private texcoord_: Array<vec2>;
  private normal_: Array<vec3>;
  private position_: Array<vec4>;

  constructor(ctx: GameContext, path: string) {
    this.faces_ = [];
    this.lines_ = [];
    this.texcoord_ = [];
    this.normal_ = [];
    this.position_ = [];

    const loader = ctx.getFileLoader();
    this.filePromise = loader.open(path).then(f => f.waitUntilReady()).then(this.loadFile.bind(this));
  }

  

  faces() {
    return this.faces_[Symbol.iterator]() as IterableIterator<ReadonlyArray<string>>;
  }

  texcoords() {
    return this.texcoord_[Symbol.iterator]() as IterableIterator<ReadonlyVec2>;
  }

  normals() {
    return this.normal_[Symbol.iterator]() as IterableIterator<ReadonlyVec3>;
  }

  positions() {
    return this.position_[Symbol.iterator]() as IterableIterator<ReadonlyVec4>;
  }

  lines() {
    return this.lines_[Symbol.iterator]() as IterableIterator<readonly [number, number]>;
  }

  async waitUntilLoaded() {
    await this.filePromise;
  }

  

  private loadFile(file: FileLike) {
    if (file.fail) {
      return;
      // throw err?
    }

    const data = file.asString().split(/\r?\n/).map(val => val.trim());
    for (let line of data) {
      this.handleLine(line); 
    }
  }

  // store line data as quickly as possible
  // faces we can probably leave
  // vertex data let's convert to #
  // groups probably ignored for now :(
  private handleLine(line: string) {
    let init : string = line.charAt(0);
    switch (init) {
      case "#":
        // comment
        return;
      case "f":
        this.logFace(line);
        break;
      case "g":
        // disregard for now :(
        console.log("encountered group statement:\n" + line);
        return;
      case "l":
        this.logLine(line);
        break;
      case "v":
        const data = this.getVertexData(line);
        let sub = line.charAt(1);
        let dataLength = 2;
        let dest : Array<any>;
        switch (sub) {
          case "t":
            dataLength = 2;
            dest = this.texcoord_;
            break;
          case "n":
            dataLength = 3;
            dest = this.normal_;
            break;
          default:
            dataLength = 4;
            while (data.length < 4) {
              data.push(1);
            }

            dest = this.position_;
            break;
        }

        dest.push(data);
        break;
      default:
        console.log("Unhandled line:\n" + line);
    }
  }

  private logFace(line: string) {
    const lineData = line.substring(1).trim().split(/ +/);
    this.faces_.push(lineData);
  }

  private logLine(line: string) {
    const lineData = line.substring(1).trim().split(/ +/).map(val => Number.parseInt(val)) as Array<number>;
    for (let i = 1; i < lineData.length; i++) {
      this.lines_.push([lineData[i - 1], lineData[i]]);
    }
  }

  private getVertexData(line: string) {
    const lineData = line.substring(2).trim().split(/ +/);
    const vec = lineData.map((val) => Number.parseFloat(val));
    return vec;
  }
}