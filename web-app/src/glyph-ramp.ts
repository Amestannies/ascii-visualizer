/*
 * The glyph ramp: 16 characters ordered from the least ink (' ') to the most ink ('@').
 * A pixel's brightness picks one of them: dark pixel -> early glyph, bright pixel -> late glyph.
 * The order was chosen by measuring how much ink each character draws (Part 4).
 * Shared by the 2D panel (ascii-2d.ts), the sampler (glyph-grid.ts) and the atlas (glyph-atlas.ts),
 * so all three always agree on which number means which character.
 */
export function glyph(){
const glyphRamp = [' ', '`', '.', '-', ':', ';', ')', 'i', '{', 'I', 'w', 'd', 'O', 'Q', 'W', '@'];
return glyphRamp;
}


