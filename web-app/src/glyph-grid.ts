import { glyph } from './glyph-ramp.ts';
const glyphRamp = glyph();

/*
 * Turns a photo into one glyph number (0-15) per grid cell.
 * The photo is drawn small (columns x rows) on a hidden canvas, so each canvas pixel
 * stands for one cell; that pixel's brightness picks the glyph.
 * Used by BOTH the 2D panel and the 3D field, so they always show the same picture.
 * Returns a Float32Array because the 3D field hands it straight to the GPU as the aGlyph attribute.
 */
export function sampleGlyphs( bitmap: ImageBitmap, columns: number, rows: number ) {
  const canvas = document.createElement( 'canvas' );
  canvas.height = rows;
  canvas.width = columns;

  const ctx = canvas.getContext( '2d' );
  if (!ctx) {
    throw new Error( '2D context unavailable - cannot sample image' );
  }
  // shrink the whole photo into the small canvas: one pixel per cell
  ctx.drawImage( bitmap, 0, 0, canvas.width, canvas.height );
  // one flat array, 4 numbers per pixel (red, green, blue, alpha), row by row
  const imageData = ctx.getImageData( 0, 0, columns, rows );

  const glyphs = new Float32Array( columns * rows );
  for (let i = 0; i < glyphs.length; i++) {
    const pixelIndex = i * 4;   // pixel i starts at its red value; 4 values per pixel

    const red = imageData.data[ pixelIndex] ; 
    const green = imageData.data[pixelIndex + 1];
    const blue = imageData.data[pixelIndex + 2];

    // Rec. 709 brightness (0-255): green looks brightest to the eye, blue darkest
    const brightness = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

    // 0-255 -> 0-15: dividing by 256 (not 255) keeps the brightest pixel at 15, never 16
    glyphs[ i ]= Math.floor( brightness / 256 * glyphRamp.length );

  }

  return glyphs;
}
