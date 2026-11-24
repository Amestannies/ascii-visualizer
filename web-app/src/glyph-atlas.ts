import { glyph } from './glyph-ramp.ts';
const glyphRamp = glyph();

/*Creates the 3D version of the visCtx.fillText for the glyphs*/
/*
 * Draws all 16 glyphs once onto a hidden 256 x 256 canvas: a 4 x 4 grid of 64 px cells,
 * white text on black. main.ts turns it into a texture (the "atlas"), and the fragment
 * shader copies one cell of it onto each point.
 *
 *   glyph index:   0  1  2  3      row 0 (top)
 *                  4  5  6  7      row 1
 *                  8  9 10 11      row 2
 *                 12 13 14 15      row 3 (bottom)
 */
export function createCanvas() {
  const canvas = document.createElement( 'canvas' );
  const gridCount = 4;     // cells per side (4 x 4 = 16 glyphs)
  const cellSize = 64;     // px per cell
  const fontSize = 48;     // px, leaves a margin inside each 64 px cell

  canvas.width = gridCount * cellSize;   // 4 x 64 = 256 px
  canvas.height = canvas.width;          // square atlas

  const ctx = canvas.getContext( '2d' );
  if (!ctx) {
    throw new Error( '2D context unavailable - cannot draw glyph atlas' );
  }
  // black background: the shader shows black where there is no ink
  ctx.fillStyle = '#000000';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );
  ctx.font = `${ fontSize }px monospace`;
  ctx.fillStyle = '#ffffff';
  // centre each glyph on the point given to fillText
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for ( let glyphIndex = 0; glyphIndex < glyphRamp.length; glyphIndex++ ) {
    // index -> cell: left to right, then the next row down
    const column = glyphIndex % gridCount;
    const row = Math.floor( glyphIndex / gridCount );
    // the CENTRE of that cell, in px (the names say edge; + cellSize / 2 makes it the centre)
    const leftEdge = ( column * cellSize) + cellSize / 2;
    const topEdge = ( row * cellSize ) + cellSize / 2;

    ctx.fillText( glyphRamp[ glyphIndex ], leftEdge, topEdge );
  }
  // without this return the caller gets undefined and the texture is empty (fixed in 738de2d)
  return canvas;
}
