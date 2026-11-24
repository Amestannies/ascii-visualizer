export const state = {
  /* fields form, rotation, and zoom are inputs which are targets written by keys and gestures*/
  form: 1, // 1 = together, 0 = apart
  rotation: { x: 0, y: 0 }, // in radians 
  zoom: 1, // 1 = normal size of image 2 = twice as big
  /* output field that only animate() writes to */
  explode: 0 // 0 = the image 1 = fully scattered
};
