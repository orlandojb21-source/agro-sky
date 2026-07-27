import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney, formatDateOnly } from "@/lib/format";

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
  clienteTelefono: string | null;
  clienteDireccion: string | null;
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
  doc.text(`Factura No. ${String(factura.numeroFactura).padStart(4, "0")}`, 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let yCliente = 30;
  for (const linea of [
    `Fecha: ${formatDateOnly(factura.fecha)}`,
    `Nombre del Cliente: ${factura.clienteNombre}`,
    `Número de Teléfono: ${factura.clienteTelefono ?? "—"}`,
    `Dirección: ${factura.clienteDireccion ?? "—"}`,
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

  doc.save(`agro-sky-factura-${String(factura.numeroFactura).padStart(4, "0")}.pdf`);
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
      (f.tipo === "gasto" ? "−" : "+") + formatMoney(f.monto),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [21, 128, 61] },
  });

  doc.save(`${nombreArchivo}.pdf`);
}

// Informe semanal de Proyectos: NO son ventas ni facturas, es solo un
// analisis interno de costo/ganancia por trabajo (aparte de Caja
// Menuda/Planilla). Cada operacion (Drone 1/2/3, Subcontratista) puede
// facturar varias tarifas la misma semana (tramos) y tiene sus propios 7
// gastos operativos fijos.
export type OperacionExportable = {
  etiqueta: string;
  operador: string | null;
  tramos: { hectareas: number; precio: number; subtotal: number }[];
  diesel: number;
  gasolina: number;
  viaticos: number;
  planilla: number;
  alquilerDrone: number;
  alquilerCarro: number;
  lavadoCarro: number;
};

export type PersonalDiaExportable = { nombre: string; rol: string; fecha: string; monto: number };

export type InformeProyectoExportable = {
  proyecto: string;
  ubicacion: string | null;
  fechaDesde: string;
  fechaHasta: string;
  precioReferencia: number | null;
  operaciones: OperacionExportable[];
  personal: PersonalDiaExportable[];
};

function gastosOperacion(op: OperacionExportable): number {
  return (
    op.diesel + op.gasolina + op.viaticos + op.planilla + op.alquilerDrone + op.alquilerCarro + op.lavadoCarro
  );
}
function montoOperacion(op: OperacionExportable): number {
  return op.tramos.reduce((s, t) => s + t.subtotal, 0);
}
function hectareasOperacion(op: OperacionExportable): number {
  return op.tramos.reduce((s, t) => s + t.hectareas, 0);
}

function nombreArchivoProyecto(proyecto: string): string {
  return `agro-sky-proyecto-${proyecto.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export async function exportarInformeProyectoPDF(informe: InformeProyectoExportable) {
  const doc = new jsPDF({ orientation: "landscape" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();

  let y = 15;
  const logoBase64 = await cargarLogoBase64();
  if (logoBase64) {
    const logoAlto = 18;
    const logoAncho = logoAlto * LOGO_ASPECTO;
    doc.addImage(logoBase64, "PNG", (anchoPagina - logoAncho) / 2, 8, logoAncho, logoAlto);
    y = 8 + logoAlto + 6;
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(informe.proyecto, anchoPagina / 2, y, { align: "center" });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const subtitulo = [informe.ubicacion, `${formatDateOnly(informe.fechaDesde)} al ${formatDateOnly(informe.fechaHasta)}`]
    .filter(Boolean)
    .join(" — ");
  doc.text(subtitulo, anchoPagina / 2, y, { align: "center" });
  y += 5;
  if (informe.precioReferencia !== null) {
    doc.text(`Precio de referencia: ${formatMoney(informe.precioReferencia)}`, anchoPagina / 2, y, {
      align: "center",
    });
    y += 5;
  }
  y += 4;

  let totalMonto = 0;
  let totalGastos = 0;
  let totalHectareas = 0;

  for (const op of informe.operaciones) {
    const gastos = gastosOperacion(op);
    const monto = montoOperacion(op);
    const hectareas = hectareasOperacion(op);
    totalMonto += monto;
    totalGastos += gastos;
    totalHectareas += hectareas;

    if (y > altoPagina - 60) {
      doc.addPage();
      y = 15;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${op.etiqueta}${op.operador ? ` (${op.operador})` : ""}`, 14, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Hectáreas", "Precio", "Subtotal"]],
      body:
        op.tramos.length > 0
          ? op.tramos.map((t) => [String(t.hectareas), formatMoney(t.precio), formatMoney(t.subtotal)])
          : [["—", "—", "—"]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 128, 61] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

    autoTable(doc, {
      startY: y,
      head: [["Gasto operativo", "Monto"]],
      body: [
        ["Diésel", formatMoney(op.diesel)],
        ["Gasolina 91", formatMoney(op.gasolina)],
        ["Viáticos", formatMoney(op.viaticos)],
        ["Planilla", formatMoney(op.planilla)],
        ["Alquiler Drone", formatMoney(op.alquilerDrone)],
        ["Alquiler Carro", formatMoney(op.alquilerCarro)],
        ["Lavado de Carro", formatMoney(op.lavadoCarro)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 128, 61] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Hectáreas: ${hectareas}   Monto: ${formatMoney(monto)}   Gastos: ${formatMoney(gastos)}   Ganancia: ${formatMoney(monto - gastos)}`,
      14,
      y,
    );
    y += 9;
  }

  if (y > altoPagina - 40) {
    doc.addPage();
    y = 15;
  }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Total informe — Hectáreas: ${totalHectareas}   Monto: ${formatMoney(totalMonto)}   Gastos: ${formatMoney(totalGastos)}   Ganancia: ${formatMoney(totalMonto - totalGastos)}`,
    14,
    y,
  );
  y += 9;

  if (informe.personal.length > 0) {
    if (y > altoPagina - 40) {
      doc.addPage();
      y = 15;
    }
    doc.setFontSize(11);
    doc.text("Personal por día", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Nombre", "Rol", "Fecha", "Monto"]],
      body: informe.personal.map((p) => [p.nombre, p.rol, formatDateOnly(p.fecha), formatMoney(p.monto)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 128, 61] },
    });
  }

  doc.save(`${nombreArchivoProyecto(informe.proyecto)}.pdf`);
}

export async function exportarInformeProyectoExcel(informe: InformeProyectoExportable) {
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet("Proyecto");
  hoja.getColumn(1).width = 30;
  hoja.getColumn(2).width = 16;
  hoja.getColumn(3).width = 16;
  hoja.getColumn(4).width = 16;

  hoja.addRow([celdaSegura(informe.proyecto)]).font = { bold: true, size: 14 };
  if (informe.ubicacion) hoja.addRow([celdaSegura(informe.ubicacion)]);
  hoja.addRow([`${formatDateOnly(informe.fechaDesde)} al ${formatDateOnly(informe.fechaHasta)}`]);
  if (informe.precioReferencia !== null) {
    hoja.addRow([`Precio de referencia: ${formatMoney(informe.precioReferencia)}`]);
  }
  hoja.addRow([]);

  let totalMonto = 0;
  let totalGastos = 0;
  let totalHectareas = 0;

  for (const op of informe.operaciones) {
    const gastos = gastosOperacion(op);
    const monto = montoOperacion(op);
    const hectareas = hectareasOperacion(op);
    totalMonto += monto;
    totalGastos += gastos;
    totalHectareas += hectareas;

    hoja.addRow([`${celdaSegura(op.etiqueta)}${op.operador ? ` (${celdaSegura(op.operador)})` : ""}`]).font = {
      bold: true,
    };

    hoja.addRow(["Hectáreas", "Precio", "Subtotal"]).font = { bold: true };
    for (const t of op.tramos) {
      hoja.addRow([t.hectareas, t.precio, t.subtotal]);
    }

    hoja.addRow(["Diésel", op.diesel]);
    hoja.addRow(["Gasolina 91", op.gasolina]);
    hoja.addRow(["Viáticos", op.viaticos]);
    hoja.addRow(["Planilla", op.planilla]);
    hoja.addRow(["Alquiler Drone", op.alquilerDrone]);
    hoja.addRow(["Alquiler Carro", op.alquilerCarro]);
    hoja.addRow(["Lavado de Carro", op.lavadoCarro]);
    hoja.addRow(["Total gastos", gastos]).font = { bold: true };
    hoja.addRow(["Ganancia", monto - gastos]).font = { bold: true };
    hoja.addRow([]);
  }

  hoja.addRow(["TOTAL INFORME"]).font = { bold: true };
  hoja.addRow(["Hectáreas", totalHectareas]);
  hoja.addRow(["Monto", totalMonto]);
  hoja.addRow(["Gastos", totalGastos]);
  hoja.addRow(["Ganancia", totalMonto - totalGastos]);

  if (informe.personal.length > 0) {
    hoja.addRow([]);
    hoja.addRow(["Personal por día"]).font = { bold: true };
    hoja.addRow(["Nombre", "Rol", "Fecha", "Monto"]).font = { bold: true };
    for (const p of informe.personal) {
      hoja.addRow([celdaSegura(p.nombre), p.rol, formatDateOnly(p.fecha), p.monto]);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  descargarArchivo(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${nombreArchivoProyecto(informe.proyecto)}.xlsx`,
  );
}
