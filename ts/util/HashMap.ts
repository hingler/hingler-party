import { Hashable } from "../Hashable";

const MAX_EPSILON = 2.5;

export interface Pair<T extends Hashable, U> {
  key: T;
  value: U;
}

class HashMapIterator<T extends Hashable, U> implements Iterator<Pair<T, U>> {
  private tableIterator: Iterator<Array<Pair<T, U>>>;
  private subtableIterator: Iterator<Pair<T, U>>;
  private table: Array<Array<Pair<T, U>>>;
  constructor(table: Array<Array<Pair<T, U>>>) {
    this.table = table;
    this.tableIterator = this.table[Symbol.iterator]();
    // would be neat if we had some global flag to track hash table modifications
    this.updateSubtableIterator();
  }

  private updateSubtableIterator() {
    let subtable : IteratorResult<Array<Pair<T, U>>, Array<Pair<T, U>>>;
    do {
      subtable = this.tableIterator.next();
    } while ((!subtable.value || subtable.value.length <= 0) && !subtable.done);

    if (subtable.done) {
      // indicate that iteration is done
      this.subtableIterator = null;
    } else {
      this.subtableIterator = subtable.value[Symbol.iterator]();
    }
  }

  next() {
    if (this.subtableIterator === null) {
      return {
        done: true,
        value: null
      };
    }
    let res = this.subtableIterator.next();
    while (res.done && this.subtableIterator !== null) {
      this.updateSubtableIterator();
      if (this.subtableIterator !== null) {
        res = this.subtableIterator.next();
      }
    }
    
    return res;
  }
}

export class HashMap<T extends Hashable, U> implements Iterable<Pair<T, U>> {
  private hashTable: Array<Array<Pair<T, U>>>;
  private size_: number;

  /**
   * Creates a new HashMap.
   * @param mod - index size of hash table. defaults to 16.
   */
  constructor(mod?: number) {
    const size = (mod ? mod : 15);
    this.hashTable = new Array(size);
    this.size_ = 0;
  }

  [Symbol.iterator]() : Iterator<Pair<T, U>> {
    return new HashMapIterator(this.hashTable);
  }

  put(key: T, value: U) : U {
    if (this.size_ / this.hashTable.length > MAX_EPSILON) {
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
        return oldVal.value;
      }
    }

    // no dupe, insert straight
    dest.push(res);
    this.size_++;
    return null;
  }

  get(key: T) : U | null {
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

  has(key: T) : boolean {
    const index = key.hash() % this.hashTable.length;
    const dest = this.hashTable[index];
    if (!dest) {
      return false;
    }

    for (let pair of dest) {
      if (key.equals(pair.key)) {
        return true;
      }
    }

    return false;
  }

  get size() {
    return this.size_;
  }

  private rehash() {
    const oldTable = this.hashTable;
    this.hashTable = new Array(Math.round(oldTable.length * MAX_EPSILON));
    this.size_ = 0;
    for (let chain of oldTable) {
      for (let pair of chain) {
        // don't do this? we don't have to worry about collisions so we could probably
        // save some performance
        this.put(pair.key, pair.value);
      }
    }
  }
}
