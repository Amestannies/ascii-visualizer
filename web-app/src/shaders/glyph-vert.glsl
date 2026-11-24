// Vertex shader (Parts 5-7): runs once per POINT (one point = one glyph).
// It decides where the point goes on screen and how big it is.
// Modern GLSL ES 3.00 (glslVersion: THREE.GLSL3): 'in' / 'out' instead of attribute / varying.
// Three.js adds position, modelViewMatrix and projectionMatrix for us.

uniform float uSize;        // gap between neighbouring points, in world units (spacing x zoom)
uniform float uHalfHeight;  // half the canvas height in pixels (updated on resize)
uniform float uExplode;     // 0 = picture, 1 = fully scattered (eased by animate())

in float aGlyph;    // which of the 16 glyphs this point shows
in vec3 aOffset;    // this point's random scatter direction (x explodeDistance)
in float aDepth;    // this point's depth from the depth model
out float vGlyph;   // passed on to the fragment shader

void main(){
  // grid position, pushed forward/back by depth, plus part of its scatter offset
  vec3 moved = position + vec3(0.0, 0.0, aDepth)+ aOffset * uExplode;
  vec4 mvPosition = modelViewMatrix * vec4(moved, 1.0);   // into camera space
  gl_Position = projectionMatrix * mvPosition;            // onto the screen
  // world size -> pixels at this distance, so neighbouring glyphs just touch at any zoom
  gl_PointSize = uSize * projectionMatrix[1][1] * uHalfHeight / -mvPosition.z;
  vGlyph = aGlyph;
}
