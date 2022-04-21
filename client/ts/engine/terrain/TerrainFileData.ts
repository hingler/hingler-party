// specify file layout
// turn terrainfiledata into terrain tiles
// tiles will simply track sample data
// we'll abstract them behind a "sampler" which accrues multiple tiles
// our terrain object itself will reference this sampler to gen terrain
// and our collision object will get the sampler and generate mipmaps from it

import { TerrainFileLayerData } from "./TerrainFileLayerData";

export class TerrainFileData {
  layerList: Array<TerrainFileLayerData>;

  constructor(data: ArrayBuffer) {
    // file reading is difficult
  }
}