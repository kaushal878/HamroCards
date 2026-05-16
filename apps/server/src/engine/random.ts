import { createHash } from 'node:crypto';

function hashToInt(input: string): number {
  return createHash('sha256').update(input).digest().readUInt32BE(0);
}

export function seededShuffle<T>(items: T[], seed: string): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = hashToInt(`${seed}:${i}`) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
