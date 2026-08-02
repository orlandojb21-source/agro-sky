// Límite máximo para cualquier archivo que suba un usuario (fotos de
// colaborador, firmas dibujadas, capturas de control de drone). El
// navegador ya comprime la imagen antes de subirla (comprimirImagen.ts),
// pero ese límite hay que aplicarlo también aquí del lado del servidor:
// cualquier usuario autenticado podría llamar la Server Action
// directamente (sin pasar por el formulario ni la compresión) y subir un
// archivo de cualquier tamaño si no se revisa acá.
export const TAMANO_MAXIMO_ARCHIVO_BYTES = 5 * 1024 * 1024; // 5 MB
