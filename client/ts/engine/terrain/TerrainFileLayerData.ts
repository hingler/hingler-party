export interface TerrainFileLayerData {
  tileResolution: number;
  tileScale: number;
  heightScale: number;
  tileCenter: [number, number];
  tileList: Array<TerrainFileTileData>;
}