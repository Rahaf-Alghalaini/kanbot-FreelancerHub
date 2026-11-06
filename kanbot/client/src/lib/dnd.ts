import { closestCorners, pointerWithin, type CollisionDetection } from '@dnd-kit/core';

/**
 * Collision rule for boards and lists: what is under the pointer wins, and a card wins over its column.
 * Containers use ids like "col:done" / "list:backlog"; cards use plain ids. Falls back to closest corners
 * (e.g. while using the keyboard, when there is no pointer).
 */
export const boardCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length) {
    const card = hits.find((h) => !String(h.id).includes(':'));
    return [card ?? hits[0]];
  }
  return closestCorners(args);
};
