import { state } from './state.ts';

window.addEventListener('keydown', (event) => {
  const key = event.key;
  switch (key.toLowerCase()) {
    case 'e':
      state.form = 0;
      break;
    case 'f':
      state.form = 1;
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
      state.zoom *= 1.1;
      break;
    case '-':
      state.zoom = state.zoom / 1.1;
      break;
    default:
      return;
  }
  event.preventDefault();

  console.log(state);
});
