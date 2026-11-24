/*
 * Keyboard controls (Part 6). Each key changes a TARGET in state; animate() in main.ts
 * eases the field toward it. Keys never touch the field or explode directly.
 *   E / F            explode / form (put back together)
 *   arrow keys       rotate by pi/12 (15 degrees) per press
 *   = / -            zoom in / out by 10 %
 */
import { state } from './state.ts';

window.addEventListener('keydown', (event) => {
  const key = event.key;
  // toLowerCase: 'E' with Caps Lock or Shift still counts; arrow names become 'arrowup' etc.
  switch (key.toLowerCase()) {
    case 'e':
      state.form = 0;   // apart
      break;
    case 'f':
      state.form = 1;   // together
      break;
    case 'arrowup':
      state.rotation.x += Math.PI / 12;
      break;
    case 'arrowdown':
      state.rotation.x = state.rotation.x - Math.PI / 12;
      break;
    case 'arrowleft':
      state.rotation.y = state.rotation.y - Math.PI / 12;
      break;
    case 'arrowright':
      state.rotation.y += Math.PI / 12;
      break;
    case '=':
      state.zoom *= 1.1;   // multiply, so zooming in and out are equal steps at any size
      break;
    case '-':
      state.zoom = state.zoom / 1.1;
      break;
    default:
      return;   // any other key: leave it alone (typing, browser shortcuts)
  }
  // only handled keys get here: stop the arrows from scrolling the page
  event.preventDefault();

  // Firefox shows objects LIVE when expanded, so read the collapsed line for this moment's values
  console.log(state);
});
