/*
 * The shared state (Part 6): the ONE place the controls and the animation meet.
 * Keys (keyboard-controls.ts) and gestures (hand-controls.ts) write TARGETS here;
 * animate() in main.ts eases what is on screen toward them, by time, so motion is smooth
 * at any frame rate. Design and its critique: planning-decisions.md section 1.
 */
export const state = {
  /* fields form, rotation, and zoom are inputs which are targets written by keys and gestures*/
  form: 1, // 1 = together, 0 = apart
  rotation: { x: 0, y: 0 }, // in radians 
  zoom: 1, // 1 = normal size of image 2 = twice as big
  /* output field that only animate() writes to */
  explode: 0 // 0 = the image 1 = fully scattered
};
