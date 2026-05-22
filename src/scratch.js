function test(orient, oldX, oldY, oldW, oldH) {
  const cx = oldX + oldW/2;
  const cy = oldY + oldH/2;
  const newW = oldH;
  const newH = oldW;
  const newX = cx - newW/2;
  const newY = cy - newH/2;
  console.log(`newX: cx - newW/2 = (${oldX} + ${oldW}/2) - ${oldH}/2`);
  console.log(`newY: cy - newH/2 = (${oldY} + ${oldH}/2) - ${oldW}/2`);
}
