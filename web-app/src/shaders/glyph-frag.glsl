// Fragment shader (Part 5): runs once per PIXEL of each point's square.
// It copies the right glyph's cell out of the 4 x 4 atlas texture.

out vec4 fragColor;          // our own output colour (gl_FragColor is the old, removed style)
uniform sampler2D uAtlas;    // the glyph atlas from glyph-atlas.ts
in float vGlyph;             // which glyph (0-15), from the vertex shader

void main(){
  // glyph number -> its cell in the 4 x 4 grid (mod / floor because GLSL has no %)
  float column = mod(vGlyph, 4.0);
  float row = floor(vGlyph / 4.0);
  // where we are inside the point, 0-1. gl_PointCoord's y points DOWN; textures count UP, so flip it
  vec2 pointUv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
  // row 0 is the TOP of the atlas, which is v 0.75-1.0, so use 3.0 - row; / 4.0 shrinks to one cell
  // e.g. '@' (15): column 3, row 3 -> cell starts at (0.75, 0.0)
  vec2 uv = (vec2(column, 3.0 - row) + pointUv) / 4.0;
  fragColor = texture(uAtlas, uv);

}
