import { Hashable } from "../Hashable";

const MAX_EPSILON = 2.5;

export interface Pair<T extends Hashable, U> {
  key: T;
  value: U;
}

export class HashMap<T extends Hashable, U> {
  private hashTable: Array<Array<Pair<T, U>>>;
  private size: number;

  constructor() {
    this.hashTable = new Array(12);
    this.size = 0;
  }

  put(key: T, value: U) : Pair<T, U> {
    if (this.size / this.hashTable.length > MAX_EPSILON) {
      this.rehash();
    }
    const hash = key.hash();
    const index = (hash % this.hashTable.length);

    // ensure arr is instantiated
    if (!this.hashTable[index]) {
      this.hashTable[index] = [];
    }

    const dest = this.hashTable[index];
    const res : Pair<T, U> = {
      "key": key,
      "value": value
    };

    for (let i = 0; i < dest.length; i++) {
      const test = dest[i];
      if (test.key.equals(res.key)) {
        // duplicate encountered
        const oldVal = dest[i];
        dest[i] = res;
        return oldVal;
      }
    }

    // no dupe, insert straight
    dest.push(res);
    this.size++;
    return null;
  }

  get(key: T) : U {
    const index = key.hash() % this.hashTable.length;
    const dest = this.hashTable[index];
    if (!dest) {
      return null;
    }

    for (let pair of dest) {
      if (key.equals(pair.key)) {
        return pair.value;
      }
    }

    return null;
  }

  private rehash() {
    // create a new map, store the old map
    // use "put" to reinsert everything into the new hashtable

    const oldTable = this.hashTable;
    this.hashTable = [];
    for (let chain of oldTable) {
      for (let pair of chain) {
        this.put(pair.key, pair.value);
      }
    }
  }
}
