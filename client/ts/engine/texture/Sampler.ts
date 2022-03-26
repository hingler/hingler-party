/**
 * Simple interface for a sampler.
 * @param T - the type of data stored in the sampler.
 */
export interface Sampler<T> {
  // the resolution of this sampler
  readonly resolution: [number, number];

  /**
   * Samples the underlying data via nearest neighbor sampling.
   * @param x - the x coordinate of the data we wish to fetch, in pixels offset from the left.
   * @param y - the y coordinate of the data we wish to fetch, in pixels offset from the top.
   * @returns a copy of the desired data, or null if the data could not be retrieved.
   */
  sampleNearest(x: number, y: number) : T | null;
}