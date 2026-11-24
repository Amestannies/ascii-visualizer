/*
 * The 2D ASCII panel (Part 3): the flat reference picture in the top-left corner.
 * On every upload it samples the photo into glyph numbers (glyph-grid.ts) and draws the
 * matching characters as text, so the 3D field can be compared against it.
 */
import { glyph } from './glyph-ramp.ts';
import { sampleGlyphs } from './glyph-grid.ts';

const glyphRamp = glyph();
// the file picker from index.html; the 3D field (main.ts) listens to the same input
const imageInput = document.querySelector<HTMLInputElement>('#image-upload');
if (imageInput === null) {
  throw new Error('Invalid ID - #image-upload required');

}
imageInput.addEventListener('change', async () => {
  // ?.[0]: the first chosen file, or undefined if the picker was cancelled
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

  // one text cell = one glyph. Measure the real width of a monospace character
  // (about 0.6 x its height) instead of guessing it.
  const fontSize = 12;
  visCtx.font = `${fontSize}px monospace`;
  const cellHeight = fontSize;
  const cellWidth = visCtx.measureText('M').width;

  const bitmap = await createImageBitmap(file);   // decode the photo
  const column = 80;                              // 80 glyphs across
  // text cells are taller than wide, so use fewer rows to keep the photo's shape
  // (the 3D field uses square points, so it leaves charRatio out)
  const charRatio = cellWidth / cellHeight;
  const row = Math.round(column * (bitmap.height / bitmap.width) * charRatio);

  const glyphs = sampleGlyphs(bitmap, column, row);

  // resizing a canvas clears it, so size it first, then paint the dark background
  visCanvas.width = column * cellWidth;
  visCanvas.height = row * cellHeight;
  visCtx.fillStyle = '#111111';
  visCtx.fillRect(0, 0, visCanvas.width, visCanvas.height);

  // set the font again: resizing the canvas also reset it
  visCtx.font = `${fontSize}px monospace`;
  visCtx.textBaseline = 'top';    // y = the top of each cell
  visCtx.fillStyle = '#ffffff';

  // row by row; glyphs is flat, so cell (x, y) is at y * column + x
  for (let y = 0; y < row; y++) {
    for (let x = 0; x < column; x++) {
      const glyphIndex = glyphs[y * column + x];
      visCtx.fillText(glyphRamp[glyphIndex], x * cellWidth, y * cellHeight);   // cells -> pixels
    }
  }
});
