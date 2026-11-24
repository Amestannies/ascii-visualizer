out vec4 fragColor;
uniform sampler2D uAtlas;
in float vGlyph;

void main(){
  float column = mod(vGlyph, 4.0);
  float row = floor(vGlyph / 4.0);
  vec2 pointUv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
  vec2 uv = (vec2(column, 3.0 - row) + pointUv) / 4.0;
  fragColor = texture(uAtlas, uv);

}
