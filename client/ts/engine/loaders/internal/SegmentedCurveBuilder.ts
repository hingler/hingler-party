// builds a segmented curve from a series of segment specifications and vertex specifications
// todo: how can we share a list of vertices between an OBJMap and this builder?
// we'll probably disambiguate with two different functions :3

/**
 * Builds a segmented curve based on inputs consistent with the OBJ spec.
 */
export class SegmentedCurveBuilder {
  private segments: Map<number, number>;

  // pick an entry at random (first iterator target?)
  // search for entries which end at that point
}