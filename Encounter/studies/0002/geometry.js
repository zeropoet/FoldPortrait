// Geometry is independent of camera and time. No viewer input changes the body.
export function buildCurves(identity) {
  if (!/^[0-9a-f]{64}$/.test(identity.convergenceHash) ||
      !/^(?:[0-9a-f]{2})+$/.test(identity.memorySignature)) throw new Error("Invalid inherited identity");
  const bytes = (hex) => hex.match(/../g).map((part) => parseInt(part, 16));
  const hash = bytes(identity.convergenceHash);
  const memory = bytes(identity.memorySignature);
  const ribs = hash.map((byte, i) => {
    const left = -(70 + byte * .43) / 65;
    const right = (52 + hash[(i + 11) % 32] * .48) / 65;
    const weight = memory[i % memory.length] / 21;
    return Array.from({ length: 65 }, (_, j) => {
      const t = j / 64;
      const bow = Math.sin(t * Math.PI);
      return [left + (right - left) * t, (15.5 - i) * .19 + bow * .045 * weight,
        bow * (.10 + .16 * weight)];
    });
  });
  const path = Array.from({ length: 257 }, (_, i) => {
    const t = i / 256;
    const p = t * (memory.length - 1);
    const k = Math.min(Math.floor(p), memory.length - 2);
    const blend = (1 - Math.cos((p - k) * Math.PI)) / 2;
    const value = memory[k] * (1 - blend) + memory[k + 1] * blend;
    return [(value - 10.5) * .018, 3.13 - t * 6.26, .94 + value * .007];
  });
  return { ribs, path };
}
