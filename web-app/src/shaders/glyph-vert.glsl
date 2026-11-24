in float aGlyph;
out float vGlyph;

void main(){
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = 9.0;
  vGlyph = aGlyph;
}
