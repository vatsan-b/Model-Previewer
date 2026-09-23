import { STLLoader } from 'three/addons/loaders/STLLoader.js';

const loader = new STLLoader();

export function parseStlBuffer(buffer) {
  const geometry = loader.parse(buffer);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}
