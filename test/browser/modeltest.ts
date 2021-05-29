import { expect } from "chai";
import { EngineContext } from "../../client/ts/engine/internal/EngineContext";
import { FileLoader } from "../../client/ts/engine/loaders/FileLoader";
import { GLTFLoaderImpl } from "../../client/ts/engine/loaders/internal/GLTFLoaderImpl";

const canvas = document.getElementById("test-canvas") as HTMLCanvasElement;

describe("GLTFLoader", function() {
  it("Should read a plain scene", async function() {
    let temp = new FileLoader();
    let ctx = new EngineContext(canvas, null);
    let loader = new GLTFLoaderImpl(temp, ctx);
    let res = await loader.loadGLTFModel("../data/test.glb");
    expect(res).is.not.null;
    
    console.log(res);
  })
})