import { expect } from "chai";
import { ShaderFileParser } from "../../client/ts/engine/gl/internal/ShaderFileParser";
import { FileLoader } from "../../client/ts/engine/loaders/FileLoader";

describe("ShaderFileParser", function() {
  it("Should read a plain shader", async function() {
    let loader = new FileLoader();
    let parser = new ShaderFileParser(loader);

    let file = await parser.parseShaderFile("../data/shader-a.txt");
    expect(file).to.equal("yourmother");
  });

  it("Should handle include statements", async function() {
    let loader = new FileLoader();
    let parser = new ShaderFileParser(loader);

    let file = await parser.parseShaderFile("../data/shader-b.txt");
    let test = await parser.parseShaderFile("../data/shader-b-parsed.txt");
    expect(file).to.equal(test);
  })
});