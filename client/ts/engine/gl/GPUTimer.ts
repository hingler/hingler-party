export interface GPUTimer {
  // start query
  // end query
  // async get result

  // concurrent queries?

  // we create a link between starts and ends
  // if another instance calls "end" before you, we end the query, then start it again,
  // and when the instance finally ends we just trace back all of the results from its "startpoint" to now
  
  // this requires some way to trace back "starts" and "ends"
  // create a queue which contains three data types
  //  - identifiable "starts"
  //  - intervals (numbers)
  //  - identifiable "ends"

  // when a start starts, we restart the query, and create an interval "slot" which will eventually be populated
  // with its result

  // when a query ends, we produce an "end"
  //  (if someone is still waiting, we produce an interval block and start it up again)

  /**
   * Begins a GPU query.
   */
  startQuery() : void;

  /**
   * Ends a GPU query.
   */
  endQuery() : void;

  /**
   * Resolves to the ns interval on the query
   */
  getQueryResult() : Promise<number>;
}