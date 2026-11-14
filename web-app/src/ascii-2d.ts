const imageInput = document.querySelector<HTMLInputElement>( '#image-upload' ); 
if ( imageInput === null ) {
  throw new Error( 'Invalid ID - #image-upload required' );
    
}
imageInput.addEventListener( 'change', async () => {
  const file = imageInput.files?.[0];
  if ( !file ) {
    return;
  }
  const bitmap = await createImageBitmap( file );
  const column = 80;
  const charRatio = 0.5;
  const row = Math.round( column * ( bitmap.height / bitmap.width ) * charRatio );

  const hidCanvas = document.createElement( 'canvas' );
  hidCanvas.height = row;
  hidCanvas.width = column;

  const ctx = hidCanvas.getContext( '2d' );
  if (!ctx) {
    return;
  }
  ctx.drawImage( bitmap, 0, 0, hidCanvas.width, hidCanvas.height );
  const imageData = ctx.getImageData( 0, 0, column, row );

  const visCanvas = document.querySelector<HTMLCanvasElement>('#ascii-canvas');
  if ( !visCanvas ) {
    throw new Error('Invalid ID - #ascii-canvas required');
  }
  const visCtx = visCanvas.getContext( '2d' );
  if ( !visCtx ) {
    return;
  }

  const fontSize = 12;
  visCtx.font = `${ fontSize }px monospace`;
  const cellHeight = fontSize; 
  const cellWidth = visCtx.measureText( 'M' ).width;

  visCanvas.width = column * cellWidth;
  visCanvas.height = row * cellHeight;
  visCtx.fillStyle = '#111111';
  visCtx.fillRect( 0, 0, visCanvas.width, visCanvas.height );

  visCtx.font = `${ fontSize }px monospace`;
  visCtx.textBaseline = 'top';
  visCtx.fillStyle = '#ffffff';
  visCtx.fillText( '@', 0, 0 );

   console.log( imageData );
} );

console.log( imageInput );

