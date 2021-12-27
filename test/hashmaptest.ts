import { expect } from "chai";
import { Hashable } from "../ts/Hashable";
import { HashMap } from "../ts/util/HashMap";

class HashTest implements Hashable {
  readonly value: number;
  constructor(val: number) {
    this.value = val;
  }

  hash() {
    return this.value % 512;
  }

  equals(other: Hashable) {
    if (other instanceof HashTest) {
      return this.value === other.value;
    }

    return false;
  }
}

describe("HashMap", function() {
  it("Should construct with no complaints", function() {
    const hash : HashMap<HashTest, number> = new HashMap();
    hash.put(new HashTest(1), 3);

    const verify = new HashTest(1);
    expect(hash.get(verify)).to.equal(3);
  });

  it("Should disambiguate between values who will hash to the same index", function() {
    const hash : HashMap<HashTest, number> = new HashMap(15);
    const hashA = new HashTest(2);
    const hashB = new HashTest(17);

    hash.put(hashA, 100);
    hash.put(hashB, 200);

    expect(hash.get(hashA)).to.equal(100);
    expect(hash.get(hashB)).to.equal(200);

    const hashC = new HashTest(182);
    expect(hash.get(hashC)).to.be.null;
  });

  it("Should handle resizes", function() {
    const map = new HashMap<HashTest, number>(12);
    for (let i = 0; i < 64; i++) {
      const val = new HashTest(i);
      map.put(val, i);
    }

    for (let i = 0; i < 64; i++) {
      const val = new HashTest(i);
      expect(map.get(val)).to.equal(i);
    }
  });

  it("Should disambiguate between keys whose hash value is the same", function() {
    const hash = new HashMap<HashTest, number>();

    const hashA = new HashTest(2);
    const hashB = new HashTest(514);

    hash.put(hashA, 100);
    hash.put(hashB, 200);

    expect(hash.get(hashA)).to.equal(100);
    expect(hash.get(hashB)).to.equal(200);
  });

  it("Should allow us to iterate over entries", function() {
    const map = new HashMap<HashTest, number>();
    for (let i = 0; i < 512; i++) {
      const val = new HashTest(i);
      map.put(val, i);
    }

    let found : Array<boolean> = new Array(512);
    for (let i = 0; i < 512; i++) {
      found[i] = false;
    }

    for (let pair of map) {
      expect(pair.key.value).to.equal(pair.value);
      found[pair.key.value] = true;
    }

    for (let i = 0; i < 512; i++) {
      expect(found[i]).to.be.true;
    }
  })
});