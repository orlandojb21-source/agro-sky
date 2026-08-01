import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney, formatDateOnly } from "@/lib/format";
import { textoEquipoDeCampo } from "@/lib/proyectoGastos";

export type FilaExportable = {
  numeroParte: string;
  descripcion: string;
  cantidad: number;
  costo: number;
  venta: number;
  fila: string | null;
  contenedor: string | null;
  unidad: string | null;
};

// Evita inyeccion de formulas en Excel: si un texto libre (descripcion,
// numero de parte, etc.) empieza con =, +, - o @, Excel podria interpretarlo
// como formula al abrir el archivo. Anteponer una comilla simple lo fuerza a
// tratarse como texto plano, sin cambiar lo que el usuario ve en la celda.
function celdaSegura(valor: string): string {
  return /^[=+\-@]/.test(valor) ? `'${valor}` : valor;
}

function descargarArchivo(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportarExcel(filas: FilaExportable[], nombreArchivo: string) {
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet("Inventario");

  hoja.columns = [
    { header: "Número de parte", key: "numeroParte", width: 20 },
    { header: "Descripción", key: "descripcion", width: 35 },
    { header: "Fila", key: "fila", width: 12 },
    { header: "Contenedor", key: "contenedor", width: 14 },
    { header: "Unidad", key: "unidad", width: 14 },
    { header: "Cantidad", key: "cantidad", width: 12 },
    { header: "Costo", key: "costo", width: 12 },
    { header: "Valor de Inventario", key: "valorInventario", width: 18 },
    { header: "Venta", key: "venta", width: 12 },
  ];
  hoja.getRow(1).font = { bold: true };

  for (const f of filas) {
    hoja.addRow({
      numeroParte: celdaSegura(f.numeroParte),
      descripcion: celdaSegura(f.descripcion),
      fila: celdaSegura(f.fila ?? ""),
      contenedor: celdaSegura(f.contenedor ?? ""),
      unidad: celdaSegura(f.unidad ?? ""),
      cantidad: f.cantidad,
      costo: f.costo,
      valorInventario: f.costo * f.cantidad,
      venta: f.venta,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  descargarArchivo(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${nombreArchivo}.xlsx`,
  );
}

export function exportarPDF(filas: FilaExportable[], nombreArchivo: string, titulo: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(titulo, 14, 15);

  autoTable(doc, {
    startY: 20,
    head: [
      [
        "Número de parte",
        "Descripción",
        "Fila",
        "Contenedor",
        "Unidad",
        "Cantidad",
        "Costo",
        "Valor de Inventario",
        "Venta",
      ],
    ],
    body: filas.map((f) => [
      f.numeroParte,
      f.descripcion,
      f.fila ?? "",
      f.contenedor ?? "",
      f.unidad ?? "",
      String(f.cantidad),
      formatMoney(f.costo),
      formatMoney(f.costo * f.cantidad),
      formatMoney(f.venta),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [21, 128, 61] },
  });

  doc.save(`${nombreArchivo}.pdf`);
}

// logo-claro.png es la version con elementos oscuros pensada para fondos
// claros (ver Logo.tsx) -- un PDF siempre se ve/imprime sobre blanco, asi
// que es la version correcta aqui (logo.png tiene partes blancas invisibles
// sobre blanco). El archivo original es 6348x7672px; jsPDF incrusta la
// imagen a su resolucion real sin importar el tamaño de despliegue que se
// le pida, asi que insertarlo directo genera un PDF de mas de 100MB.
// Se reescala en un canvas a un tamaño razonable para pantalla/impresion
// antes de convertirlo a base64.
const LOGO_ASPECTO = 6348 / 7672;
const LOGO_ANCHO_PX = 300;

async function cargarLogoBase64(): Promise<string | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No se pudo cargar el logo"));
      el.src = "/logo-claro.png";
    });

    const altoPx = Math.round(LOGO_ANCHO_PX / LOGO_ASPECTO);
    const canvas = document.createElement("canvas");
    canvas.width = LOGO_ANCHO_PX;
    canvas.height = altoPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, LOGO_ANCHO_PX, altoPx);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export type ServicioExportable = {
  nombre: string;
  descripcion: string | null;
  costo: number | null;
  precio: number | null;
};

export async function exportarServiciosExcel(filas: ServicioExportable[], nombreArchivo: string) {
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet("Servicios");

  hoja.columns = [
    { header: "Código", key: "nombre", width: 30 },
    { header: "Descripción", key: "descripcion", width: 40 },
    { header: "Costo referencial", key: "costo", width: 18 },
    { header: "Precio referencial", key: "precio", width: 18 },
  ];
  hoja.getRow(1).font = { bold: true };

  for (const f of filas) {
    hoja.addRow({
      nombre: celdaSegura(f.nombre),
      descripcion: celdaSegura(f.descripcion ?? ""),
      costo: f.costo ?? "",
      precio: f.precio ?? "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  descargarArchivo(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${nombreArchivo}.xlsx`,
  );
}

export function exportarServiciosPDF(
  filas: ServicioExportable[],
  nombreArchivo: string,
  titulo: string,
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(titulo, 14, 15);

  autoTable(doc, {
    startY: 20,
    head: [["Código", "Descripción", "Costo referencial", "Precio referencial"]],
    body: filas.map((f) => [
      f.nombre,
      f.descripcion ?? "",
      f.costo !== null ? formatMoney(f.costo) : "",
      f.precio !== null ? formatMoney(f.precio) : "",
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [21, 128, 61] },
  });

  doc.save(`${nombreArchivo}.pdf`);
}

// Datos fijos de la empresa para la factura, tal como los dio el cliente
// (boceto a mano con el formato exacto que quiere).
const AGRO_SKY_INFO = {
  nombre: "AGRO SKY",
  telefono: "6574-1019",
  correo: "agrosky.pty@gmail.com",
  direccion: "Chitré, Panamá",
};

export type FacturaItemExportable = {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

export type FacturaExportable = {
  numeroFactura: number;
  fecha: string;
  clienteNombre: string;
  clienteRuc: string | null;
  clienteRucDv: string | null;
  clienteTelefono: string | null;
  clienteDireccion: string | null;
  clienteCorreo: string | null;
  items: FacturaItemExportable[];
  subtotalGravado: number;
  subtotalExento: number;
  itbms: number;
  total: number;
};

// Factura en formato carta vertical, con el logo y los datos de Agro Sky
// arriba a la derecha (como letterhead) y el numero de factura + datos del
// cliente arriba a la izquierda -- mismo layout que el boceto que dio el
// cliente como referencia.
export async function exportarFacturaPDF(factura: FacturaExportable) {
  const doc = new jsPDF({ orientation: "portrait" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const margenDerecho = anchoPagina - 14;

  let yEmpresa = 14;
  const logoBase64 = await cargarLogoBase64();
  if (logoBase64) {
    const logoAlto = 16;
    const logoAncho = logoAlto * LOGO_ASPECTO;
    doc.addImage(logoBase64, "PNG", margenDerecho - logoAncho, yEmpresa, logoAncho, logoAlto);
    yEmpresa += logoAlto + 4;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(AGRO_SKY_INFO.nombre, margenDerecho, yEmpresa, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  yEmpresa += 5;
  for (const linea of [
    `Teléfono: ${AGRO_SKY_INFO.telefono}`,
    `Correo: ${AGRO_SKY_INFO.correo}`,
    `Dirección: ${AGRO_SKY_INFO.direccion}`,
  ]) {
    doc.text(linea, margenDerecho, yEmpresa, { align: "right" });
    yEmpresa += 4.5;
  }

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(`Factura No. ${String(factura.numeroFactura).padStart(10, "0")}`, 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let yCliente = 30;
  const ruc = factura.clienteRuc
    ? `${factura.clienteRuc}${factura.clienteRucDv ? ` DV ${factura.clienteRucDv}` : ""}`
    : "—";
  for (const linea of [
    `Fecha: ${formatDateOnly(factura.fecha)}`,
    `Nombre del Cliente: ${factura.clienteNombre}`,
    `RUC: ${ruc}`,
    `Número de Teléfono: ${factura.clienteTelefono ?? "—"}`,
    `Dirección: ${factura.clienteDireccion ?? "—"}`,
    `Correo: ${factura.clienteCorreo ?? "—"}`,
  ]) {
    doc.text(linea, 14, yCliente);
    yCliente += 6;
  }

  const startY = Math.max(yCliente, yEmpresa) + 6;

  autoTable(doc, {
    startY,
    head: [["Código", "Descripción", "Cantidad", "P/U", "P/Total"]],
    body: factura.items.map((it) => [
      it.codigo,
      it.descripcion,
      String(it.cantidad),
      formatMoney(it.precioUnitario),
      formatMoney(it.subtotal),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [21, 128, 61] },
  });

  const tablaFinalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const anchoResumen = 75;
  const xEtiqueta = margenDerecho - anchoResumen;
  let yResumen = tablaFinalY + 8;
  doc.setFontSize(10);
  for (const [etiqueta, valor, negrita] of [
    ["Subtotal gravado", formatMoney(factura.subtotalGravado), false],
    ["Subtotal exento", formatMoney(factura.subtotalExento), false],
    ["ITBMS (7%)", formatMoney(factura.itbms), false],
    ["Total", formatMoney(factura.total), true],
  ] as const) {
    doc.setFont("helvetica", negrita ? "bold" : "normal");
    doc.text(etiqueta, xEtiqueta, yResumen);
    doc.text(valor, margenDerecho, yResumen, { align: "right" });
    yResumen += 6;
  }

  doc.save(`agro-sky-factura-${String(factura.numeroFactura).padStart(10, "0")}.pdf`);
}

export type OrdenCompraItemExportable = {
  codigo: string;
  descripcion: string;
  cantidad: number;
};

export type OrdenCompraExportable = {
  numeroOrden: number;
  fecha: string;
  proveedorNombre: string;
  proveedorContacto: string | null;
  items: OrdenCompraItemExportable[];
};

// Orden de Compra en el mismo formato carta vertical que la Factura, pero
// con los datos del proveedor en vez del cliente y sin precios/totales --
// es una lista de lo que se le pide al proveedor, no un documento de cobro.
export async function exportarOrdenCompraPDF(orden: OrdenCompraExportable) {
  const doc = new jsPDF({ orientation: "portrait" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const margenDerecho = anchoPagina - 14;

  let yEmpresa = 14;
  const logoBase64 = await cargarLogoBase64();
  if (logoBase64) {
    const logoAlto = 16;
    const logoAncho = logoAlto * LOGO_ASPECTO;
    doc.addImage(logoBase64, "PNG", margenDerecho - logoAncho, yEmpresa, logoAncho, logoAlto);
    yEmpresa += logoAlto + 4;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(AGRO_SKY_INFO.nombre, margenDerecho, yEmpresa, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  yEmpresa += 5;
  for (const linea of [
    `Teléfono: ${AGRO_SKY_INFO.telefono}`,
    `Correo: ${AGRO_SKY_INFO.correo}`,
    `Dirección: ${AGRO_SKY_INFO.direccion}`,
  ]) {
    doc.text(linea, margenDerecho, yEmpresa, { align: "right" });
    yEmpresa += 4.5;
  }

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(`Orden de Compra No. ${String(orden.numeroOrden).padStart(4, "0")}`, 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let yProveedor = 30;
  for (const linea of [
    `Fecha: ${formatDateOnly(orden.fecha)}`,
    `Proveedor: ${orden.proveedorNombre}`,
    `Contacto: ${orden.proveedorContacto ?? "—"}`,
  ]) {
    doc.text(linea, 14, yProveedor);
    yProveedor += 6;
  }

  const startY = Math.max(yProveedor, yEmpresa) + 6;

  autoTable(doc, {
    startY,
    head: [["Código", "Descripción", "Cantidad"]],
    body: orden.items.map((it) => [it.codigo, it.descripcion, String(it.cantidad)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [21, 128, 61] },
  });

  doc.save(`agro-sky-orden-compra-${String(orden.numeroOrden).padStart(4, "0")}.pdf`);
}

export type FilaInformeExportable = { drone: string; hectareas: number; precio: number; total: number };

export type ItemGastoOperativoExportable = {
  categoria: string;
  etiqueta: string;
  cantidad: number;
  precio: number;
  total: number;
};

export type BloqueGastoOperativoExportable = {
  drone: string;
  operador: string | null;
  ayudantes: string[];
  items: ItemGastoOperativoExportable[];
};

export type InformeProyectoExportable = {
  proyecto: string;
  ubicacion: string | null;
  hectareas: number | null;
  precio: number | null;
  total: number | null;
  fechaDesde: string;
  fechaHasta: string;
  filas: FilaInformeExportable[];
  gastosOperativos: BloqueGastoOperativoExportable[];
};

function nombreArchivoProyecto(proyecto: string): string {
  return `agro-sky-proyecto-${proyecto.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

// Mismo formato carta vertical con letterhead que la Factura/Orden de
// Compra. El encabezado (Proyecto/Ubicacion/Hectareas/Precio/Total/Fecha)
// se imprime tal como se llenó a mano, no se recalcula a partir de las
// filas -- mismo principio que en el formulario.
export async function exportarInformeProyectoPDF(informe: InformeProyectoExportable) {
  const doc = new jsPDF({ orientation: "portrait" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const margenDerecho = anchoPagina - 14;

  let yEmpresa = 14;
  const logoBase64 = await cargarLogoBase64();
  if (logoBase64) {
    const logoAlto = 16;
    const logoAncho = logoAlto * LOGO_ASPECTO;
    doc.addImage(logoBase64, "PNG", margenDerecho - logoAncho, yEmpresa, logoAncho, logoAlto);
    yEmpresa += logoAlto + 4;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(AGRO_SKY_INFO.nombre, margenDerecho, yEmpresa, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  yEmpresa += 5;
  for (const linea of [
    `Teléfono: ${AGRO_SKY_INFO.telefono}`,
    `Correo: ${AGRO_SKY_INFO.correo}`,
    `Dirección: ${AGRO_SKY_INFO.direccion}`,
  ]) {
    doc.text(linea, margenDerecho, yEmpresa, { align: "right" });
    yEmpresa += 4.5;
  }

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(informe.proyecto, 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let yInforme = 30;
  for (const linea of [
    `Ubicación: ${informe.ubicacion ?? "—"}`,
    `Hectáreas: ${informe.hectareas ?? "—"}`,
    `Precio: ${informe.precio !== null ? formatMoney(informe.precio) : "—"}`,
    `Total: ${informe.total !== null ? formatMoney(informe.total) : "—"}`,
    `Fecha: ${formatDateOnly(informe.fechaDesde)} al ${formatDateOnly(informe.fechaHasta)}`,
  ]) {
    doc.text(linea, 14, yInforme);
    yInforme += 6;
  }

  const startY = Math.max(yInforme, yEmpresa) + 6;

  const totalFilas = informe.filas.reduce((s, f) => s + f.total, 0);
  const hectareasFilas = informe.filas.reduce((s, f) => s + f.hectareas, 0);

  autoTable(doc, {
    startY,
    head: [["Drone", "HA", "Precio", "Total"]],
    body: informe.filas.map((f) => [
      f.drone,
      String(f.hectareas),
      formatMoney(f.precio),
      formatMoney(f.total),
    ]),
    foot: [["total", String(hectareasFilas), "", formatMoney(totalFilas)]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [21, 128, 61] },
    footStyles: { fillColor: [220, 252, 231], textColor: [20, 83, 45], fontStyle: "bold" },
  });

  let yGastos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  const altoPagina = doc.internal.pageSize.getHeight();

  for (const bloque of informe.gastosOperativos) {
    if (yGastos > altoPagina - 60) {
      doc.addPage();
      yGastos = 15;
    }

    const equipo = textoEquipoDeCampo(bloque.operador, bloque.ayudantes);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const tituloBloque = `Gastos operativos — ${bloque.drone}${equipo ? ` (${equipo})` : ""}`;
    const lineasTitulo = doc.splitTextToSize(tituloBloque, anchoPagina - 28) as string[];
    doc.text(lineasTitulo, 14, yGastos);
    yGastos += lineasTitulo.length * 5;

    const totalBloque = bloque.items.reduce((s, it) => s + it.total, 0);

    autoTable(doc, {
      startY: yGastos,
      head: [["Categoría", "Cantidad", "Precio unitario", "Total"]],
      body: bloque.items.map((it) => [
        it.etiqueta,
        String(it.cantidad),
        formatMoney(it.precio),
        formatMoney(it.total),
      ]),
      foot: [["total", "", "", formatMoney(totalBloque)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 128, 61] },
      footStyles: { fillColor: [220, 252, 231], textColor: [20, 83, 45], fontStyle: "bold" },
    });
    yGastos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  doc.save(`${nombreArchivoProyecto(informe.proyecto)}.pdf`);
}

export type MovimientoExportable = {
  fecha: string;
  tipo: "gasto" | "reposicion";
  categoria: string | null;
  nombre: string | null;
  numeroRecibo: string | null;
  concepto: string | null;
  colaborador: string | null;
  previsto: number | null;
  entregado: number | null;
  vuelto: number | null;
  monto: number;
  nota: string | null;
};

export async function exportarMovimientosExcel(filas: MovimientoExportable[], nombreArchivo: string) {
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet("Caja Menuda");

  hoja.columns = [
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Tipo", key: "tipo", width: 12 },
    { header: "Categoría", key: "categoria", width: 18 },
    { header: "Nombre / Nota", key: "nombre", width: 25 },
    { header: "# Recibo", key: "numeroRecibo", width: 14 },
    { header: "Concepto", key: "concepto", width: 18 },
    { header: "Colaborador", key: "colaborador", width: 18 },
    { header: "Previsto", key: "previsto", width: 12 },
    { header: "Entregado", key: "entregado", width: 12 },
    { header: "Vuelto", key: "vuelto", width: 12 },
    { header: "Monto", key: "monto", width: 12 },
  ];
  hoja.getRow(1).font = { bold: true };

  for (const f of filas) {
    hoja.addRow({
      fecha: formatDateOnly(f.fecha),
      tipo: f.tipo === "gasto" ? "Gasto" : "Reposición",
      categoria: celdaSegura(f.categoria ?? ""),
      nombre: celdaSegura(f.nombre ?? f.nota ?? ""),
      numeroRecibo: celdaSegura(f.numeroRecibo ?? ""),
      concepto: celdaSegura(f.concepto ?? ""),
      colaborador: celdaSegura(f.colaborador ?? ""),
      previsto: f.previsto ?? "",
      entregado: f.entregado ?? "",
      vuelto: f.vuelto ?? "",
      monto: f.tipo === "gasto" ? -f.monto : f.monto,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  descargarArchivo(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${nombreArchivo}.xlsx`,
  );
}

export async function exportarMovimientosPDF(
  filas: MovimientoExportable[],
  nombreArchivo: string,
  titulo: string,
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const anchoPagina = doc.internal.pageSize.getWidth();

  let siguienteY = 15;
  const logoBase64 = await cargarLogoBase64();
  if (logoBase64) {
    const logoAlto = 22;
    const logoAncho = logoAlto * LOGO_ASPECTO;
    doc.addImage(logoBase64, "PNG", (anchoPagina - logoAncho) / 2, 8, logoAncho, logoAlto);
    siguienteY = 8 + logoAlto + 8;
  }

  doc.setFontSize(14);
  doc.text(titulo, anchoPagina / 2, siguienteY, { align: "center" });

  autoTable(doc, {
    startY: siguienteY + 6,
    head: [
      [
        "Fecha",
        "Tipo",
        "Categoría",
        "Nombre / Nota",
        "# Recibo",
        "Concepto",
        "Colaborador",
        "Previsto",
        "Entregado",
        "Vuelto",
        "Monto",
      ],
    ],
    body: filas.map((f) => [
      formatDateOnly(f.fecha),
      f.tipo === "gasto" ? "Gasto" : "Reposición",
      f.categoria ?? "",
      f.nombre ?? f.nota ?? "",
      f.numeroRecibo ?? "",
      f.concepto ?? "",
      f.colaborador ?? "",
      f.previsto !== null ? formatMoney(f.previsto) : "",
      f.entregado !== null ? formatMoney(f.entregado) : "",
      f.vuelto !== null ? formatMoney(f.vuelto) : "",
      (f.tipo === "gasto" ? "-" : "+") + formatMoney(f.monto),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [21, 128, 61] },
  });

  doc.save(`${nombreArchivo}.pdf`);
}

// Talonario de pago de un colaborador Fijo: salario bruto + bonificacion
// (si tiene) menos las deducciones legales de Panama (CSS, Seguro
// Educativo -- la bonificacion nunca las lleva). Todos los montos llegan
// aqui ya resueltos a un numero (0 si no se registraron para ese pago), el
// neto se calcula aqui mismo, nunca se guarda en la base de datos.
export type TalonarioExportable = {
  colaboradorNombre: string;
  fecha: string;
  salarioBruto: number;
  bonificacion: number;
  css: number;
  seguroEducativo: number;
};

export async function exportarTalonarioPDF(talonario: TalonarioExportable) {
  const doc = new jsPDF({ orientation: "portrait" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const margenDerecho = anchoPagina - 14;

  let yEmpresa = 14;
  const logoBase64 = await cargarLogoBase64();
  if (logoBase64) {
    const logoAlto = 16;
    const logoAncho = logoAlto * LOGO_ASPECTO;
    doc.addImage(logoBase64, "PNG", margenDerecho - logoAncho, yEmpresa, logoAncho, logoAlto);
    yEmpresa += logoAlto + 4;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(AGRO_SKY_INFO.nombre, margenDerecho, yEmpresa, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  yEmpresa += 5;
  for (const linea of [
    `Teléfono: ${AGRO_SKY_INFO.telefono}`,
    `Correo: ${AGRO_SKY_INFO.correo}`,
    `Dirección: ${AGRO_SKY_INFO.direccion}`,
  ]) {
    doc.text(linea, margenDerecho, yEmpresa, { align: "right" });
    yEmpresa += 4.5;
  }

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Talonario de Pago", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let yColaborador = 30;
  for (const linea of [
    `Colaborador: ${talonario.colaboradorNombre}`,
    `Fecha de pago: ${formatDateOnly(talonario.fecha)}`,
  ]) {
    doc.text(linea, 14, yColaborador);
    yColaborador += 6;
  }

  const totalDeducciones = talonario.css + talonario.seguroEducativo;
  const neto = talonario.salarioBruto + talonario.bonificacion - totalDeducciones;

  const startY = Math.max(yColaborador, yEmpresa) + 6;
  const anchoResumen = 90;
  const xEtiqueta = margenDerecho - anchoResumen;
  let y = startY;
  doc.setFontSize(10);
  const filas: [string, string, boolean][] = [["Salario bruto", formatMoney(talonario.salarioBruto), false]];
  if (talonario.bonificacion > 0) {
    filas.push(["Bonificación", formatMoney(talonario.bonificacion), false]);
  }
  filas.push(
    ["CSS", `-${formatMoney(talonario.css)}`, false],
    ["Seguro Educativo", `-${formatMoney(talonario.seguroEducativo)}`, false],
    ["Total deducciones", `-${formatMoney(totalDeducciones)}`, false],
  );
  for (const [etiqueta, valor, negrita] of filas) {
    doc.setFont("helvetica", negrita ? "bold" : "normal");
    doc.text(etiqueta, xEtiqueta, y);
    doc.text(valor, margenDerecho, y, { align: "right" });
    y += 6;
  }
  doc.setDrawColor(21, 128, 61);
  doc.line(xEtiqueta, y, margenDerecho, y);
  y += 6;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Neto pagado", xEtiqueta, y);
  doc.text(formatMoney(neto), margenDerecho, y, { align: "right" });

  const nombreSlug = talonario.colaboradorNombre.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  doc.save(`agro-sky-talonario-${nombreSlug}-${talonario.fecha}.pdf`);
}

export type InformeCampoExportable = {
  cliente: string;
  fecha: string;
  finca: string;
  horaInicio: string;
  horaFin: string;
  meteorologia: string;
  modeloDrone: string;
  dosisPorHectarea: number;
  operador: string;
  ayudantes: string[];
  nombreFirmaAgro: string | null;
  firmaAgroUrl: string | null;
  nombreFirmaCliente: string | null;
  firmaClienteUrl: string | null;
  parcelas: { numeroParcela: string; hectareas: number }[];
  productos: { productoActivo: string; ltsPorHectarea: number }[];
};

// Carga cualquier URL (ej. una URL firmada de Storage) como base64 vía un
// canvas -- mismo principio que cargarLogoBase64(), pero para una imagen
// que no es el logo fijo del proyecto (aquí, una firma dibujada).
async function cargarImagenBase64(url: string): Promise<string | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No se pudo cargar la imagen"));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function nombreArchivoInformeCampo(cliente: string, fecha: string): string {
  return `agro-sky-informe-campo-${cliente.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${fecha}`;
}

export async function exportarInformeCampoPDF(informe: InformeCampoExportable) {
  const doc = new jsPDF({ orientation: "portrait" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const margenDerecho = anchoPagina - 14;

  let yEmpresa = 14;
  const logoBase64 = await cargarLogoBase64();
  if (logoBase64) {
    const logoAlto = 16;
    const logoAncho = logoAlto * LOGO_ASPECTO;
    doc.addImage(logoBase64, "PNG", margenDerecho - logoAncho, yEmpresa, logoAncho, logoAlto);
    yEmpresa += logoAlto + 4;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(AGRO_SKY_INFO.nombre, margenDerecho, yEmpresa, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  yEmpresa += 5;
  for (const linea of [
    `Teléfono: ${AGRO_SKY_INFO.telefono}`,
    `Correo: ${AGRO_SKY_INFO.correo}`,
    `Dirección: ${AGRO_SKY_INFO.direccion}`,
  ]) {
    doc.text(linea, margenDerecho, yEmpresa, { align: "right" });
    yEmpresa += 4.5;
  }

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Informe de Campo", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const equipo = textoEquipoDeCampo(informe.operador, informe.ayudantes);
  let yInforme = 30;
  for (const linea of [
    `Cliente: ${informe.cliente}`,
    `Fecha: ${formatDateOnly(informe.fecha)}`,
    `Finca: ${informe.finca}`,
    `Hora: ${informe.horaInicio.slice(0, 5)} a ${informe.horaFin.slice(0, 5)}`,
    `Meteorología: ${informe.meteorologia}`,
    `Modelo de Drone: ${informe.modeloDrone}`,
    `Dosis por Hectárea: ${informe.dosisPorHectarea}`,
    equipo,
  ]) {
    doc.text(linea, 14, yInforme);
    yInforme += 6;
  }

  const startY = Math.max(yInforme, yEmpresa) + 6;

  const totalHectareas = informe.parcelas.reduce((s, p) => s + p.hectareas, 0);

  autoTable(doc, {
    startY,
    head: [["Parcela #", "Hectáreas"]],
    body: informe.parcelas.map((p) => [p.numeroParcela, String(p.hectareas)]),
    foot: [["total", String(totalHectareas)]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [21, 128, 61] },
    footStyles: { fillColor: [220, 252, 231], textColor: [20, 83, 45], fontStyle: "bold" },
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Productos es opcional -- no siempre se usa, si no hay filas no se
  // imprime la tabla (ni el espacio que dejaría vacía).
  if (informe.productos.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Producto activo", "Lts por Hectárea"]],
      body: informe.productos.map((p) => [p.productoActivo, String(p.ltsPorHectarea)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 128, 61] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  const altoPagina = doc.internal.pageSize.getHeight();
  if (y > altoPagina - 70) {
    doc.addPage();
    y = 20;
  }

  const anchoFirma = 80;
  const altoFirma = 28;
  const columnas = [
    { x: 14, nombre: informe.nombreFirmaAgro, url: informe.firmaAgroUrl, etiqueta: "Encargado Agro Sky Corp" },
    {
      x: anchoPagina - 14 - anchoFirma,
      nombre: informe.nombreFirmaCliente,
      url: informe.firmaClienteUrl,
      etiqueta: "Encargado por parte del cliente",
    },
  ];

  for (const col of columnas) {
    if (col.url) {
      const firmaBase64 = await cargarImagenBase64(col.url);
      if (firmaBase64) {
        doc.addImage(firmaBase64, "PNG", col.x, y, anchoFirma, altoFirma);
      }
    }
    doc.setDrawColor(150, 150, 150);
    doc.line(col.x, y + altoFirma + 2, col.x + anchoFirma, y + altoFirma + 2);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(col.nombre ?? "", col.x, y + altoFirma + 7);
    doc.setFontSize(8);
    doc.text(col.etiqueta, col.x, y + altoFirma + 12);
  }

  doc.save(`${nombreArchivoInformeCampo(informe.cliente, informe.fecha)}.pdf`);
}
