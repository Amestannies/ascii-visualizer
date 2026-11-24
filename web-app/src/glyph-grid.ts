import { glyph } from './glyph-ramp.ts';
const glyphRamp = glyph();

export function sampleGlyphs( bitmap: ImageBitmap, columns: number, rows: number ) {
  const canvas = document.createElement( 'canvas' );
  canvas.height = rows;
  canvas.width = columns;

  const ctx = canvas.getContext( '2d' );
  if (!ctx) {
    throw new Error( '2D context unavailable - cannot sample image' );
  }
  ctx.drawImage( bitmap, 0, 0, canvas.width, canvas.height );
  const imageData = ctx.getImageData( 0, 0, columns, rows );

  const glyphs = new Float32Array( columns * rows );
  for (let i = 0; i < glyphs.length; i++) {
    const pixelIndex = i * 4;

    const red = imageData.data[ pixelIndex] ; 
    const green = imageData.data[pixelIndex + 1];
    const blue = imageData.data[pixelIndex + 2];

    const brightness = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

    glyphs[ i ]= Math.floor( brightness / 256 * glyphRamp.length );

  }

  return glyphs;
}
