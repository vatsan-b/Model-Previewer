import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { formatLength, getBoundingDimensions, getDistance } from '../src/measurements.js';

test('reports axis-aligned bounding dimensions in model units', () => {
  const box = new Box3(new Vector3(-2, 1, 4), new Vector3(8, 6, 7.5));
  assert.deepEqual(getBoundingDimensions(box), { x: 10, y: 5, z: 3.5 });
});

test('measures the Euclidean distance between picked points', () => {
  assert.equal(getDistance(new Vector3(0, 0, 0), new Vector3(3, 4, 12)), 13);
});

test('formats millimetres with appropriate precision', () => {
  assert.equal(formatLength(12), '12.00 mm');
  assert.equal(formatLength(0.125), '0.125 mm');
});

test('returns zero dimensions for an empty geometry bounding box', () => {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([], 3));
  geometry.computeBoundingBox();
  assert.deepEqual(getBoundingDimensions(geometry.boundingBox), { x: 0, y: 0, z: 0 });
});
