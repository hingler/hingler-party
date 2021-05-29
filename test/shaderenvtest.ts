import { expect } from "chai";
import { ShaderEnv } from "../client/ts/engine/gl/ShaderEnv";
import { FileLoader } from "../client/ts/engine/loaders/FileLoader";
import { readFile } from "fs";

async function verify(expectedPath: string, actual: string) {
  // load file, break into lines, filtering emptys
  // same for actual
  // no dupe lines allowed

  const expected = await (new Promise<string>((res, rej) => readFile(expectedPath, (err, data) => {
    if (err) {
      rej(err);
    } else {
      res(data.toString("utf-8"));
    }
  })));

  console.log(actual);

  let expectedArr = expected.split(/\r?\n/).filter((val) => (val.length > 0)).map((val) => val.trim());
  let actualArr = actual.split(/\r?\n/).filter((val) => (val.length > 0)).map((val) => val.trim());

  for (let i = 0; i < actualArr.length; i++) {
    let match = false;
    for (let j = 0; j < expectedArr.length; j++) {
      if (actualArr[i] === expectedArr[j]) {
        expectedArr = expectedArr.slice(j);
        actualArr = actualArr.slice(i);
        match = true;
        break;
      }
    }

    // log info before failing
    if (match === false) {
      console.error("Expected: ");
      console.error(expected);
      console.error("Actual: ");
      console.error(actual);
    }

    expect(match).to.be.true;
  }
}

describe("ShaderEnv", function() {
  it("Should handle flags correctly", async function() {
    // context map should allow us to plug in these vals
    // setvar arg is opt
    // use a "has" function to indicate if the key is present
    // remove limitations on implicit boolean case
    let env = new ShaderEnv();
    env.setShaderVar("RANDOM_DEFINE");
    const res = env.getShaderEnv();
    await verify("./test/data/shaderenv-single-flag.txt", res);
  });

  it("Should handle a single float correctly", async function() {
    let env = new ShaderEnv();
    env.setShaderVar("HEALING_BY_PRAYER", 21.25);
    const res = env.getShaderEnv();
    await verify("./test/data/shaderenv-macro.txt", res);
  });

  it("Should handle various types of numerical data correctly", async function() {
    // how to handle integer data with our var?
    // eh, just leave it as an optional
    let env = new ShaderEnv();
    env.setShaderVar("INTEGER_VALUE", 15, true);
    env.setShaderVar("FLOAT_VALUE", 89.55);
    const res = env.getShaderEnv();
    await verify("./test/data/shaderenv-multimacro.txt", res);
  });

  it("Should behave properly when dealing with several constants", async function() {
    let env = new ShaderEnv();
    env.setShaderVar("FLAG");
    env.setShaderVar("INTEGER", 21, true);
    env.setShaderVar("INTEGER_TWO", 42, true);
    env.setShaderVar("FLOAT", 81.0, false);
    env.setShaderVar("FLOAT_TWO", 162.0, false);
    const res = env.getShaderEnv();
    await verify("./test/data/shaderenv-multitest.txt", res);
  });
});