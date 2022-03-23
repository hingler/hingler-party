import { BoundingBox } from "./BoundingBox";
import { vec3, mat4, ReadonlyVec3, ReadonlyMat4 } from "gl-matrix";



// most trivial implementation of boundingbox behavior
export class GenericBoundingBox implements BoundingBox {
  min: ReadonlyVec3;
  max: ReadonlyVec3;

  static fromPoints(...pointsList: Array<vec3>) : BoundingBox {
    if (pointsList.length <= 0) {
      return null;
    }

    const min = Array.from(pointsList[0]) as vec3;
    const max = Array.from(pointsList[0]) as vec3;

    for (let i = 0; i < pointsList.length; i++) {
      vec3.min(min, min, pointsList[i]);
      vec3.max(max, max, pointsList[i]);
    }

    return new GenericBoundingBox(min[0], max[0], min[1], max[1], min[2], max[2]);
  }

  constructor(minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number) {
    this.min = [minX, minY, minZ];
    this.max = [maxX, maxY, maxZ];
  }

  contains(point: ReadonlyVec3) {
    return (point[0] <= this.max[0] && point[0] >= this.min[0]
         && point[1] <= this.max[1] && point[1] >= this.min[1]
         && point[2] <= this.max[2] && point[2] >= this.min[2])
  }

  transform(dest: ReadonlyMat4) {
    // get list of points
    const pointList : Array<vec3> = [];
    const minMaxList : Array<ReadonlyVec3> = [this.min, this.max];

    for (let i = 0; i < 8; i++) {
      const point = [] as number[] as vec3;
      for (let j = 0; j < 3; j++) {
        point[j] = minMaxList[(i >> j) & 1][j];
      }

      vec3.transformMat4(point, point, dest);
      pointList.push(point);
    }

    return GenericBoundingBox.fromPoints(...pointList);
  }
}