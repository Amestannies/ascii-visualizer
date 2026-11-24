uniform float uSize;
uniform float uHalfHeight;

in float aGlyph;
out float vGlyph;

void main(){
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uSize * projectionMatrix[1][1] * uHalfHeight / -mvPosition.z;
  vGlyph = aGlyph;
}
