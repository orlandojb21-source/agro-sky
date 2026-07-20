export type ActionState = {
  error: string | null;
  // Datos enviados por el usuario cuando la accion falla, para poder
  // volver a mostrarlos en el formulario en vez de dejarlo en blanco
  // (los formularios con Server Actions se limpian solos al terminar).
  values?: Record<string, string>;
  // Marca una accion que guardo con exito pero no navega a otra pagina
  // (ej: editar el propio perfil), para poder mostrar una confirmacion.
  success?: boolean;
};
