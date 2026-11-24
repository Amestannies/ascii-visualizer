uniform float uSize;
uniform float uHalfHeight;
uniform float uExplode;

in float aGlyph;
in vec3 aOffset;
in float aDepth;
out float vGlyph;

void main(){
  vec3 moved = position + vec3(0.0, 0.0, aDepth)+ aOffset * uExplode;
  vec4 mvPosition = modelViewMatrix * vec4(moved, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uSize * projectionMatrix[1][1] * uHalfHeight / -mvPosition.z;
  vGlyph = aGlyph;
}
