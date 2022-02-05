// simple test program which renders an HDR texture to the screen

import { GameContext } from "../../client/ts/engine/GameContext";
import { HDRTexture } from "../../client/ts/engine/gl/internal/HDRTexture";
import { ImageTexture } from "../../client/ts/engine/gl/internal/ImageTexture";
import { EngineContext } from "../../client/ts/engine/internal/EngineContext";
import { ColorDisplay } from "../../client/ts/engine/material/ColorDisplay";
import { TextureDisplay } from "../../client/ts/engine/material/TextureDisplay";
import { GameObject } from "../../client/ts/engine/object/game/GameObject";
import { Scene } from "../../client/ts/engine/object/scene/Scene";
import { RenderContext } from "../../client/ts/engine/render/RenderContext";

window.addEventListener("load", main);

let canvas : HTMLCanvasElement;

class TextureDemo extends GameObject {
  tex: HDRTexture;
  texBackup: ImageTexture;
  disp: TextureDisplay;

  constructor(ctx: GameContext) {
    super(ctx);
    this.tex = new HDRTexture(ctx, "../data/turning_area_1k.hdr");
    this.texBackup = new ImageTexture(ctx, "../data/gunishment.png");
    this.disp = new ColorDisplay(ctx, this.tex);
  }

  renderMaterial(rc: RenderContext) {
    let gl = this.getContext().getGLContext();
    gl.disable(gl.CULL_FACE);
    this.disp.drawTexture();
  }  
}

class HDRScene extends Scene {
  constructor() {
    super();
  }

  async initialize(ctx: GameContext) {
    const root = this.getGameObjectRoot();
    let f = new TextureDemo(ctx);
    root.addChild(f);
  }
}

function main() {
  canvas = document.getElementById("canvas") as HTMLCanvasElement;
  window.addEventListener("resize", resizeCanvas);

  resizeCanvas();

  const ctx = new EngineContext(canvas, new HDRScene());
  ctx.deployContext();
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}