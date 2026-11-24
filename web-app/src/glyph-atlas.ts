import { glyph } from './glyph-ramp.ts';
const glyphRamp = glyph();

/*Creates the 3D version of the visCtx.fillText for the glyphs*/
export function createCanvas() {
  const canvas = document.createElement( 'canvas' );
  const gridCount = 4;
  const cellSize = 64;
  const fontSize = 48;

  canvas.width = gridCount * cellSize;
  canvas.height = canvas.width;

  const ctx = canvas.getContext( '2d' );
  if (!ctx) {
    throw new Error( '2D context unavailable - cannot draw glyph atlas' );
  }
  ctx.fillStyle = '#000000';
  ctx.fillRect( 0, 0, canvas.width, canvas.height );
  ctx.font = `${ fontSize }px monospace`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for ( let glyphIndex = 0; glyphIndex < glyphRamp.length; glyphIndex++ ) {
    const column = glyphIndex % gridCount;
    const row = Math.floor( glyphIndex / gridCount );
    const leftEdge = ( column * cellSize) + cellSize / 2;
    const topEdge = ( row * cellSize ) + cellSize / 2;

    ctx.fillText( glyphRamp[ glyphIndex ], leftEdge, topEdge );
  }
  return canvas;
}
