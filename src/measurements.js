export function getBoundingDimensions(box) {
  if (!box || box.isEmpty()) return { x: 0, y: 0, z: 0 };
  return {
    x: box.max.x - box.min.x,
    y: box.max.y - box.min.y,
    z: box.max.z - box.min.z,
  };
}

export function getDistance(firstPoint, secondPoint) {
  return firstPoint.distanceTo(secondPoint);
}

export function formatLength(length) {
  return `${length < 1 ? length.toFixed(3) : length.toFixed(2)} mm`;
}
