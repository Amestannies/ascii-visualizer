import { glyph } from './glyph-ramp.ts';
import { sampleGlyphs } from './glyph-grid.ts';

const glyphRamp = glyph();
const imageInput = document.querySelector<HTMLInputElement>('#image-upload');
if (imageInput === null) {
  throw new Error('Invalid ID - #image-upload required');

}
imageInput.addEventListener('change', async () => {
  const file = imageInput.files?.[0];
  if (!file) {
    return;
  }

  const visCanvas = document.querySelector<HTMLCanvasElement>('#ascii-canvas');
  if (!visCanvas) {
    throw new Error('Invalid ID - #ascii-canvas required');
  }
  const visCtx = visCanvas.getContext('2d');
  if (!visCtx) {
    return;
  }

  const fontSize = 12;
  visCtx.font = `${fontSize}px monospace`;
  const cellHeight = fontSize;
  const cellWidth = visCtx.measureText('M').width;

  const bitmap = await createImageBitmap(file);
  const column = 80;
  const charRatio = cellWidth / cellHeight;
  const row = Math.round(column * (bitmap.height / bitmap.width) * charRatio);

  const glyphs = sampleGlyphs(bitmap, column, row);

  visCanvas.width = column * cellWidth;
  visCanvas.height = row * cellHeight;
  visCtx.fillStyle = '#111111';
  visCtx.fillRect(0, 0, visCanvas.width, visCanvas.height);

  visCtx.font = `${fontSize}px monospace`;
  visCtx.textBaseline = 'top';
  visCtx.fillStyle = '#ffffff';

  for (let y = 0; y < row; y++) {
    for (let x = 0; x < column; x++) {
      const glyphIndex = glyphs[y * column + x];
      visCtx.fillText(glyphRamp[glyphIndex], x * cellWidth, y * cellHeight);
    }
  }
});
