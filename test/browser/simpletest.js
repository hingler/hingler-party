import { assert, expect } from "chai";
import { FileLoader } from "../../client/ts/engine/loaders/FileLoader";

describe("FileLoader", function() {
  it("reads the contents of a sample file", async function() {
    let test = new FileLoader(null);
    let f = await test.open("../data/shader-a.txt");
    expect(f.asString()).to.equal("yourmother");
  });

  it("Handles the concurrent loading of multiple files", async function() {
    let test = new FileLoader(null);
    let a = test.open("../data/shader-a.txt");
    let c = test.open("../data/shader-c.txt");
    let d = test.open("../data/shader-d.txt");

    // ensure it doesn't crash :(
    test.getFractionLoaded();

    let aFile = await a;
    let cFile = await c;
    let dFile = await d;

    expect(aFile.asString()).to.equal("yourmother");
    expect(cFile.asString()).to.equal("yourfather22");
    expect(dFile.asString()).to.equal("filethatimrunning");
  });
})