import { expect } from "chai";
import { RingArray } from "../client/ts/engine/gl/internal/RingArray";

describe("RingArrayTest", function() {
  it("Should instantiate properly", function() {
    const buf = new RingArray<number>(1024);
    expect(buf.length).equals(0);
    expect(buf.pop()).to.be.undefined;
    expect(buf.get(0)).to.be.undefined;
  });

  it("Should hold a single item", function() {
    const buf = new RingArray<number>(1024);
    buf.push(16);
    expect(buf.length).equals(1);
    expect(buf.pop()).to.equal(16);
    expect(buf.length).equals(0);
  });

  it("Should throw a fit when you max out", function() {
    const buf = new RingArray<number>(1024);
    for (let i = 0; i < 1024; i++) {
      buf.push(i);
      expect(buf.length).equals(i + 1);
    }

    expect(buf.push.bind(buf, -1)).to.throw;
    expect(buf.length).equals(1024);

    for (let i = 1023; i >= 0; i--) {
      expect(buf.pop()).to.equal(i);
      expect(buf.length).to.equal(i);
    }
  });

  it("Should loop!", function() {
    const buf = new RingArray<number>(344);
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 256; j++) {
        buf.push(j);
      }

      for (let j = 0; j < 256; j++) {
        expect(buf.dequeue()).to.equal(j);
      }
    }
  })
});