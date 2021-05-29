export class IDGenerator {
  idMin: number;
  idsInUse: Set<number>;
  
  constructor() {
    this.idMin = 1;
    this.idsInUse = new Set();
  }

  getNewID() {
    while (this.idsInUse.has(this.idMin)) {
      this.idsInUse.delete(this.idMin++)
    }

    return this.idMin++;
  }

  /**
   * Determines if an ID is definitely unique.
   * @param id - the ID being checked.
   * @returns true if the ID is definitely unique, false otherwise.
   *          Note that an ID which returns false may in fact be unique.
   *          However, an ID which returns true is definitely unique.
   */
  isIDUnique(id: number) {
    return (id >= this.idMin && !this.idsInUse.has(id));
  }

  /**
   * Registers a new ID as used.
   * @param id - the ID being registered.
   */
  registerNewID(id: number) {
    if (id === this.idMin) {
      this.idMin++;
    } else if (id > this.idMin) {
      this.idsInUse.add(id);
    }
  }
}