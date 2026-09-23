import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStlBuffer } from '../src/model-loader.js';

const ASCII_STL = `solid unit_triangle
facet normal 0 0 1
 outer loop
  vertex 0 0 0
  vertex 10 0 0
  vertex 0 5 0
 endloop
endfacet
endsolid unit_triangle`;

test('parses a local ASCII STL into a triangulated geometry', () => {
  const source = new TextEncoder().encode(ASCII_STL).buffer;
  const geometry = parseStlBuffer(source);
  geometry.computeBoundingBox();
  assert.equal(geometry.getAttribute('position').count, 3);
  assert.equal(geometry.boundingBox.max.x, 10);
  assert.equal(geometry.boundingBox.max.y, 5);
});
