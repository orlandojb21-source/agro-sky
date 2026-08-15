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
  doc.setTextColor(220, 38, 38);
  doc.text(`Factura No. ${String(factura.numeroFactura).padStart(10, "0")}`, 14, 20);
  doc.setTextColor(0, 0, 0);

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

export type FilaInformeExportable = {
  operador: string;
  drone: string;
  hectareas: number;
  precio: number;
  total: number;
};

export type ItemGastoOperativoExportable = {
  categoria: string;
  etiqueta: string;
  cantidad: number;
  precio: number;
  total: number;
};

export type BloqueGastoOperativoExportable = {
  operador: string | null;
  ayudantes: string[];
  items: ItemGastoOperativoExportable[];
};

export type DiaPlanillaExportable = { fecha: string; monto: number };
export type PlanillaTrabajadorExportable = { colaborador: string; dias: DiaPlanillaExportable[]; total: number };

export type GastoProyectoExportable = {
  origen: "caja_menuda" | "compras";
  fecha: string;
  categoria: string;
  descripcion: string;
  monto: number;
};

export type InformeProyectoExportable = {
  proyecto: string;
  ubicacion: string | null;
  hectareas: number | null;
  precio: number | null;
  total: number | null;
  fecha: string;
  filas: FilaInformeExportable[];
  gastosOperativos: BloqueGastoOperativoExportable[];
  detallePlanilla: PlanillaTrabajadorExportable[];
  gastosProyecto: GastoProyectoExportable[];
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
    `Fecha: ${formatDateOnly(informe.fecha)}`,
  ]) {
    doc.text(linea, 14, yInforme);
    yInforme += 6;
  }

  const startY = Math.max(yInforme, yEmpresa) + 6;

  const totalFilas = informe.filas.reduce((s, f) => s + f.total, 0);
  const hectareasFilas = informe.filas.reduce((s, f) => s + f.hectareas, 0);

  autoTable(doc, {
    startY,
    head: [["Operador", "Drone", "HA", "Precio", "Total"]],
    body: informe.filas.map((f) => [
      f.operador,
      f.drone,
      String(f.hectareas),
      formatMoney(f.precio),
      formatMoney(f.total),
    ]),
    foot: [["", "total", String(hectareasFilas), "", formatMoney(totalFilas)]],
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
    const tituloBloque = `Gastos operativos — ${equipo || "Equipo sin nombre"}`;
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

  const totalGastosEquipos = informe.gastosOperativos.reduce(
    (s, b) => s + b.items.reduce((si, it) => si + it.total, 0),
    0,
  );
  const totalGastosProyectoRegistrados = informe.gastosProyecto.reduce((s, g) => s + g.monto, 0);

  if (informe.gastosProyecto.length > 0) {
    if (yGastos > altoPagina - 60) {
      doc.addPage();
      yGastos = 15;
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Gastos registrados para este proyecto (Caja Menuda / Compras)", 14, yGastos);
    yGastos += 5;

    autoTable(doc, {
      startY: yGastos,
      head: [["Fecha", "Origen", "Categoría", "Descripción", "Monto"]],
      body: informe.gastosProyecto.map((g) => [
        formatDateOnly(g.fecha),
        g.origen === "caja_menuda" ? "Caja Menuda" : "Compras",
        g.categoria,
        g.descripcion || "—",
        formatMoney(g.monto),
      ]),
      foot: [["total", "", "", "", formatMoney(totalGastosProyectoRegistrados)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 128, 61] },
      footStyles: { fillColor: [220, 252, 231], textColor: [20, 83, 45], fontStyle: "bold" },
    });
    yGastos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (informe.gastosOperativos.length > 0 || informe.gastosProyecto.length > 0) {
    if (yGastos > altoPagina - 20) {
      doc.addPage();
      yGastos = 15;
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Total Gastos Operativos: ${formatMoney(totalGastosEquipos + totalGastosProyectoRegistrados)}`,
      14,
      yGastos,
    );
    yGastos += 10;
  }

  if (informe.detallePlanilla.length > 0) {
    if (yGastos > altoPagina - 40) {
      doc.addPage();
      yGastos = 15;
    }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Detalle de pago de Planilla", 14, yGastos);
    yGastos += 8;

    for (const trabajador of informe.detallePlanilla) {
      if (yGastos > altoPagina - 40) {
        doc.addPage();
        yGastos = 15;
      }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(trabajador.colaborador, 14, yGastos);
      yGastos += 5;

      autoTable(doc, {
        startY: yGastos,
        head: [["Fecha", "Monto"]],
        body: trabajador.dias.map((d) => [formatDateOnly(d.fecha), formatMoney(d.monto)]),
        foot: [["total", formatMoney(trabajador.total)]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [21, 128, 61] },
        footStyles: { fillColor: [220, 252, 231], textColor: [20, 83, 45], fontStyle: "bold" },
        tableWidth: 90,
      });
      yGastos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }
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

// Talonario de pago de un colaborador Fijo: salario bruto + bonificacion +
// decimoTercerMes (si tiene) menos las deducciones legales de Panama (CSS,
// Seguro Educativo -- la bonificacion nunca las lleva, y el Decimo Tercer
// Mes solo lleva CSS, nunca Seguro Educativo) y el abono a préstamo de ese
// pago, si tuvo (aparte de las deducciones legales, para que se vea la
// justificación completa de por qué el neto no coincide con el bruto).
// Todos los montos llegan aqui ya resueltos a un numero (0 si no se
// registraron para ese pago), el neto se calcula aqui mismo, nunca se
// guarda en la base de datos.
export type TalonarioExportable = {
  colaboradorNombre: string;
  fecha: string;
  salarioBruto: number;
  bonificacion: number;
  decimoTercerMes: number;
  css: number;
  seguroEducativo: number;
  montoPrestamo: number;
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
  const neto =
    talonario.salarioBruto +
    talonario.bonificacion +
    talonario.decimoTercerMes -
    totalDeducciones -
    talonario.montoPrestamo;

  const startY = Math.max(yColaborador, yEmpresa) + 6;
  const anchoResumen = 90;
  const xEtiqueta = margenDerecho - anchoResumen;
  let y = startY;
  doc.setFontSize(10);
  const filas: [string, string, boolean][] = [["Salario bruto", formatMoney(talonario.salarioBruto), false]];
  if (talonario.bonificacion > 0) {
    filas.push(["Bonificación", formatMoney(talonario.bonificacion), false]);
  }
  if (talonario.decimoTercerMes > 0) {
    filas.push(["Décimo Tercer Mes", formatMoney(talonario.decimoTercerMes), false]);
  }
  filas.push(
    ["CSS", `-${formatMoney(talonario.css)}`, false],
    ["Seguro Educativo", `-${formatMoney(talonario.seguroEducativo)}`, false],
    ["Total deducciones", `-${formatMoney(totalDeducciones)}`, false],
  );
  if (talonario.montoPrestamo > 0) {
    filas.push(["Abono a préstamo", `-${formatMoney(talonario.montoPrestamo)}`, false]);
  }
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

// Detalle de todo lo pagado en Planilla (Fijo y Campo) en un mes, por
// quincena y por mes completo -- el desglose completo de cada fila
// (Monto/Bonificación/Décimo/CSS/Seguro Educativo/Préstamo/Neto) ya viene
// calculado de obtenerReportePlanillaAction (lib/actions/planilla.ts),
// nunca aquí -- así cada cifra del PDF se puede verificar a simple vista.
export type FilaReportePlanillaExportable = {
  nombre: string;
  monto: number;
  bonificacion: number;
  decimoTercerMes: number;
  css: number;
  seguroEducativo: number;
  montoPrestamo: number;
  neto: number;
};
export type SeccionReportePlanillaExportable = {
  etiqueta: string;
  filas: FilaReportePlanillaExportable[];
  total: number;
};
export type ReportePlanillaExportable = {
  quincena1: SeccionReportePlanillaExportable;
  quincena2: SeccionReportePlanillaExportable;
  mes: SeccionReportePlanillaExportable;
};

// "—" en vez de "USD 0.00" para que las columnas que no aplican (ej. nadie
// tuvo Décimo o préstamo esa quincena) salten a la vista de una, sin
// llenar la tabla de ceros.
function formatMoneyOGuion(valor: number): string {
  return valor === 0 ? "—" : formatMoney(valor);
}

export async function exportarReportePlanillaPDF(reporte: ReportePlanillaExportable) {
  const doc = new jsPDF({ orientation: "landscape" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const margenDerecho = anchoPagina - 14;
  const altoPagina = doc.internal.pageSize.getHeight();

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
  doc.text(`Reporte de Planilla — ${reporte.mes.etiqueta}`, 14, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Neto = Monto + Bonificación + Décimo Tercer Mes − CSS − Seguro Educativo − Préstamo.", 14, 26);

  let y = Math.max(32, yEmpresa) + 6;

  function dibujarSeccion(titulo: string, seccion: SeccionReportePlanillaExportable) {
    if (y > altoPagina - 50) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(titulo, 14, y);
    y += 6;

    if (seccion.filas.length === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Sin pagos registrados.", 14, y);
      y += 10;
      return;
    }

    autoTable(doc, {
      startY: y,
      head: [["Nombre", "Monto", "Bonificación", "Décimo", "CSS", "Seguro Educ.", "Préstamo", "Neto"]],
      body: seccion.filas.map((f) => [
        f.nombre,
        formatMoneyOGuion(f.monto),
        formatMoneyOGuion(f.bonificacion),
        formatMoneyOGuion(f.decimoTercerMes),
        formatMoneyOGuion(f.css),
        formatMoneyOGuion(f.seguroEducativo),
        formatMoneyOGuion(f.montoPrestamo),
        formatMoney(f.neto),
      ]),
      foot: [["total", "", "", "", "", "", "", formatMoney(seccion.total)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 128, 61] },
      footStyles: { fillColor: [220, 252, 231], textColor: [20, 83, 45], fontStyle: "bold" },
      columnStyles: { 7: { fontStyle: "bold" } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  dibujarSeccion(`Quincena — ${reporte.quincena1.etiqueta}`, reporte.quincena1);
  dibujarSeccion(`Quincena — ${reporte.quincena2.etiqueta}`, reporte.quincena2);
  dibujarSeccion(`Total del mes — ${reporte.mes.etiqueta}`, reporte.mes);

  doc.save(`agro-sky-reporte-planilla-${reporte.mes.etiqueta.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
}

// Reporte de TODO Balance (Ventas, Caja Menuda, Compras, Planilla,
// Préstamos) para un período elegido -- cada sección ya viene calculada
// de obtenerReporteBalanceCompletoAction (lib/actions/balance.ts), acá
// solo se dibuja. Mismo formato de fila que el resto de esta librería:
// Fecha + Descripción + Monto, con su total al pie de cada tabla.
export type FilaMontoExportable = { fecha: string; descripcion: string; monto: number };
export type SeccionMontosExportable = { filas: FilaMontoExportable[]; total: number };
export type FilaCategoriaExportable = { categoria: string; monto: number };
export type ReporteBalanceCompletoExportable = {
  etiquetaPeriodo: string;
  ventas: SeccionMontosExportable;
  cajaMenudaReposiciones: SeccionMontosExportable;
  cajaMenudaGastos: SeccionMontosExportable;
  cajaMenudaPorCategoria: FilaCategoriaExportable[];
  comprasGastos: SeccionMontosExportable;
  comprasPorCategoria: FilaCategoriaExportable[];
  planilla: { filas: FilaReportePlanillaExportable[]; total: number };
  prestamos: SeccionMontosExportable;
  resumen: { ingresos: number; egresos: number; neto: number };
};

export async function exportarReporteBalanceCompletoPDF(reporte: ReporteBalanceCompletoExportable) {
  const doc = new jsPDF({ orientation: "landscape" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const margenDerecho = anchoPagina - 14;
  const altoPagina = doc.internal.pageSize.getHeight();

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

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Reporte de Balance — ${reporte.etiquetaPeriodo}`, 14, 20);

  let y = Math.max(30, yEmpresa) + 8;

  // --- Resumen ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen", 14, y);
  y += 7;
  doc.setFontSize(10);
  for (const [etiqueta, valor] of [
    ["Ingresos (Ventas)", formatMoney(reporte.resumen.ingresos)],
    ["Egresos (Caja Menuda + Compras + Planilla)", formatMoney(reporte.resumen.egresos)],
    ["Neto del período", formatMoney(reporte.resumen.neto)],
  ] as [string, string][]) {
    doc.setFont("helvetica", "normal");
    doc.text(etiqueta, 14, y);
    doc.setFont("helvetica", "bold");
    doc.text(valor, 100, y);
    y += 6;
  }
  y += 4;

  function nuevaPaginaSiHaceFalta(espacioNecesario: number) {
    if (y > altoPagina - espacioNecesario) {
      doc.addPage();
      y = 20;
    }
  }

  function tituloSeccion(texto: string) {
    nuevaPaginaSiHaceFalta(40);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(texto, 14, y);
    y += 7;
  }

  function tablaDetalle(filas: FilaMontoExportable[], total: number, sinDatos: string) {
    if (filas.length === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(sinDatos, 14, y);
      y += 10;
      return;
    }
    nuevaPaginaSiHaceFalta(30);
    autoTable(doc, {
      startY: y,
      head: [["Fecha", "Descripción", "Monto"]],
      body: filas.map((f) => [formatDateOnly(f.fecha), f.descripcion, formatMoney(f.monto)]),
      foot: [["", "total", formatMoney(total)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 128, 61] },
      footStyles: { fillColor: [220, 252, 231], textColor: [20, 83, 45], fontStyle: "bold" },
      margin: { left: 14, right: 14 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  function tablaCategorias(filas: FilaCategoriaExportable[]) {
    if (filas.length === 0) return;
    nuevaPaginaSiHaceFalta(30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Por categoría", 14, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [["Categoría", "Monto"]],
      body: filas.map((f) => [f.categoria, formatMoney(f.monto)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 128, 61] },
      tableWidth: 100,
      margin: { left: 14, right: 14 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // --- Ventas ---
  tituloSeccion("Ventas");
  tablaDetalle(reporte.ventas.filas, reporte.ventas.total, "Sin ventas registradas en este período.");

  // --- Caja Menuda ---
  tituloSeccion("Caja Menuda — Reposiciones");
  tablaDetalle(
    reporte.cajaMenudaReposiciones.filas,
    reporte.cajaMenudaReposiciones.total,
    "Sin reposiciones en este período.",
  );
  tituloSeccion("Caja Menuda — Gastos");
  tablaDetalle(reporte.cajaMenudaGastos.filas, reporte.cajaMenudaGastos.total, "Sin gastos en este período.");
  tablaCategorias(reporte.cajaMenudaPorCategoria);

  // --- Compras ---
  tituloSeccion("Compras — Gastos");
  tablaDetalle(reporte.comprasGastos.filas, reporte.comprasGastos.total, "Sin gastos en este período.");
  tablaCategorias(reporte.comprasPorCategoria);

  // --- Planilla ---
  tituloSeccion("Planilla");
  if (reporte.planilla.filas.length === 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Sin pagos registrados en este período.", 14, y);
    y += 10;
  } else {
    nuevaPaginaSiHaceFalta(30);
    autoTable(doc, {
      startY: y,
      head: [["Nombre", "Monto", "Bonificación", "Décimo", "CSS", "Seguro Educ.", "Préstamo", "Neto"]],
      body: reporte.planilla.filas.map((f) => [
        f.nombre,
        formatMoneyOGuion(f.monto),
        formatMoneyOGuion(f.bonificacion),
        formatMoneyOGuion(f.decimoTercerMes),
        formatMoneyOGuion(f.css),
        formatMoneyOGuion(f.seguroEducativo),
        formatMoneyOGuion(f.montoPrestamo),
        formatMoney(f.neto),
      ]),
      foot: [["total", "", "", "", "", "", "", formatMoney(reporte.planilla.total)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 128, 61] },
      footStyles: { fillColor: [220, 252, 231], textColor: [20, 83, 45], fontStyle: "bold" },
      columnStyles: { 7: { fontStyle: "bold" } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // --- Préstamos ---
  tituloSeccion("Préstamos otorgados");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("No cuentan como Ingreso ni Egreso -- es plata que la empresa ya tenía, no gasto nuevo.", 14, y);
  y += 6;
  tablaDetalle(reporte.prestamos.filas, reporte.prestamos.total, "Sin préstamos otorgados en este período.");

  const nombreArchivo = reporte.etiquetaPeriodo.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  doc.save(`agro-sky-reporte-balance-${nombreArchivo}.pdf`);
}

// Una fila por cada Informe de Campo (o día de Oficina) que entró en el
// cálculo del pago -- misma forma que DetalleDiaAsistencia en
// lib/actions/asistencia.ts, pero es una foto guardada con el pago
// (planilla_pagos.detalle_calculo), no un cálculo en vivo.
export type DetalleTalonarioCampo = {
  fecha: string;
  rolDia: "operador" | "ayudante";
  tipoTrabajo: "oficina" | "proyecto" | "sin_trabajo";
  jornada: "completo" | "medio" | null;
  tipoProyecto: "ingenio_santa_rosa" | "particular" | null;
  hectareas: number | null;
  clienteInforme: string | null;
  // Solo aplica a "sin_trabajo" -- el motivo (lluvia, falla mecánica,
  // etc.) guardado en Asistencia. Null en Oficina/Proyecto normal.
  motivo: string | null;
  monto: number;
};

function descripcionDetalleCampo(d: DetalleTalonarioCampo): string {
  if (d.tipoTrabajo === "oficina") {
    return `Oficina — ${d.jornada === "completo" ? "Día completo" : "Medio día"}`;
  }
  if (d.tipoTrabajo === "sin_trabajo") {
    const tipo = d.tipoProyecto === "ingenio_santa_rosa" ? "Ingenio Santa Rosa" : "Trabajo Particular";
    const jornadaTexto = d.jornada === "medio" ? " (medio día)" : "";
    return `Proyecto — no se pudo trabajar${jornadaTexto} · ${tipo}${d.motivo ? ` — ${d.motivo}` : ""}`;
  }
  if (d.hectareas === null) {
    return "Proyecto — sin Informe de Campo ese día";
  }
  if (!d.tipoProyecto) {
    return `Proyecto — ${d.clienteInforme ?? ""} (${d.hectareas} ha, sin clasificar)`;
  }
  const tipo = d.tipoProyecto === "ingenio_santa_rosa" ? "Ingenio Santa Rosa" : "Trabajo Particular";
  return `Proyecto — ${tipo} · ${d.clienteInforme ?? ""} (${d.hectareas} ha)`;
}

// Talonario para Campo -- sin CSS/Seguro Educativo/Bonificación (esas
// deducciones solo aplican a Fijo). "fechaDesde" es la quincena que cubre
// el pago; en un pago histórico (de antes de que Pagos pasara a cubrir un
// rango) llega null y se muestra solo "fecha" como fecha única. "detalle"
// es la foto del desglose día/informe guardada con el pago -- null en un
// pago histórico o en uno donde el monto se escribió a mano sin usar
// "Calcular pago sugerido" (no hay desglose que mostrar).
export type TalonarioCampoExportable = {
  colaboradorNombre: string;
  fecha: string;
  fechaDesde: string | null;
  monto: number;
  detalle: DetalleTalonarioCampo[] | null;
};

export async function exportarTalonarioCampoPDF(talonario: TalonarioCampoExportable) {
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
  const lineaFecha = talonario.fechaDesde
    ? `Período: ${formatDateOnly(talonario.fechaDesde)} al ${formatDateOnly(talonario.fecha)}`
    : `Fecha de pago: ${formatDateOnly(talonario.fecha)}`;
  for (const linea of [`Colaborador: ${talonario.colaboradorNombre}`, lineaFecha]) {
    doc.text(linea, 14, yColaborador);
    yColaborador += 6;
  }

  let y = Math.max(yColaborador, yEmpresa) + 6;

  if (talonario.detalle && talonario.detalle.length > 0) {
    const totalDetalle = talonario.detalle.reduce((s, d) => s + d.monto, 0);
    autoTable(doc, {
      startY: y,
      head: [["Fecha", "Rol", "Detalle", "Monto"]],
      body: talonario.detalle.map((d) => [
        formatDateOnly(d.fecha),
        d.rolDia === "operador" ? "Operador" : "Ayudante",
        descripcionDetalleCampo(d),
        formatMoney(d.monto),
      ]),
      foot: [["", "", "Subtotal calculado", formatMoney(totalDetalle)]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [21, 128, 61] },
      footStyles: { fillColor: [220, 252, 231], textColor: [20, 83, 45], fontStyle: "bold" },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  } else {
    y += 4;
  }

  const altoPagina = doc.internal.pageSize.getHeight();
  if (y > altoPagina - 20) {
    doc.addPage();
    y = 20;
  }

  const anchoResumen = 90;
  const xEtiqueta = margenDerecho - anchoResumen;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Monto pagado", xEtiqueta, y);
  doc.text(formatMoney(talonario.monto), margenDerecho, y, { align: "right" });

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
  tipoAplicacion: "liquido" | "granulado" | null;
  modeloDrone: string;
  dosisPorHectarea: string;
  tipoProyecto: "ingenio_santa_rosa" | "particular" | null;
  jornada: "completo" | "medio";
  operador: string;
  ayudantes: string[];
  nombreFirmaAgro: string | null;
  firmaAgroUrl: string | null;
  nombreFirmaCliente: string | null;
  firmaClienteUrl: string | null;
  parcelas: { numeroParcela: string; hectareas: number }[];
  productos: { productoActivo: string; ltsPorHectarea: number }[];
  imagenUrls: string[];
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

// Igual que cargarImagenBase64(), pero además devuelve el ancho/alto real
// del archivo -- lo necesita el Informe Diario para insertar la captura
// del control del drone sin deformarla (a diferencia de una firma, que
// siempre se dibuja en una caja de tamaño fijo).
async function cargarImagenBase64ConDimensiones(
  url: string,
): Promise<{ dataUrl: string; ancho: number; alto: number } | null> {
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
    return { dataUrl: canvas.toDataURL("image/png"), ancho: img.naturalWidth, alto: img.naturalHeight };
  } catch {
    return null;
  }
}

function nombreArchivoInformeCampo(cliente: string, fecha: string): string {
  return `agro-sky-informe-campo-${cliente.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${fecha}`;
}

// Cuerpo del Informe de Campo (todo menos el membrete/título/guardado) --
// factorizado para poder reutilizarlo tal cual dentro del Informe Diario
// (que adjunta "una copia del Informe de Campo" en su propia página, sin
// membrete propio). "yInfoLineas" es dónde arrancan las líneas de texto de
// la izquierda (fijo en el informe de campo solo, 30); "minYTabla" es la
// altura mínima antes de la tabla de Parcelas para no chocar con contenido
// a la derecha (el membrete del caller) -- pasar 0 cuando no aplica (ej. en
// una página nueva sin membrete al lado). Devuelve la Y final tras las
// firmas, por si el caller necesita seguir dibujando debajo.
async function dibujarCuerpoInformeCampo(
  doc: jsPDF,
  informe: InformeCampoExportable,
  yInfoLineas: number,
  minYTabla: number,
): Promise<number> {
  const anchoPagina = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const equipo = textoEquipoDeCampo(informe.operador, informe.ayudantes);
  let yInforme = yInfoLineas;
  for (const linea of [
    `Cliente: ${informe.cliente}`,
    `Tipo de proyecto: ${
      informe.tipoProyecto === "ingenio_santa_rosa"
        ? "Ingenio Santa Rosa"
        : informe.tipoProyecto === "particular"
          ? "Trabajo Particular"
          : "—"
    }`,
    `Fecha: ${formatDateOnly(informe.fecha)}`,
    `Finca: ${informe.finca}`,
    `Hora: ${informe.horaInicio.slice(0, 5)} a ${informe.horaFin.slice(0, 5)}`,
    `Jornada: ${informe.jornada === "medio" ? "Medio día" : "Día completo"}`,
    `Meteorología: ${informe.meteorologia}`,
    `Tipo de Aplicación: ${
      informe.tipoAplicacion === "liquido"
        ? "Líquido"
        : informe.tipoAplicacion === "granulado"
          ? "Granulado"
          : "—"
    }`,
    `Modelo de Drone: ${informe.modeloDrone}`,
    `Dosis por Hectárea: ${informe.dosisPorHectarea}`,
    equipo,
  ]) {
    doc.text(linea, 14, yInforme);
    yInforme += 6;
  }

  const startY = Math.max(yInforme, minYTabla) + 6;

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

  return y + altoFirma + 12;
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

  await dibujarCuerpoInformeCampo(doc, informe, 30, yEmpresa);

  // Imágenes adjuntas -- opcional, puede haber varias. Cada una en su
  // propia página, ajustada al ancho conservando su proporción real
  // para no deformarla (mismo patrón que la captura del control del
  // drone en Informe Diario).
  for (let i = 0; i < informe.imagenUrls.length; i++) {
    const imagen = await cargarImagenBase64ConDimensiones(informe.imagenUrls[i]);
    if (!imagen) continue;
    doc.addPage();
    const anchoPaginaImagen = doc.internal.pageSize.getWidth();
    const altoPagina = doc.internal.pageSize.getHeight();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(
      informe.imagenUrls.length > 1 ? `Imagen adjunta ${i + 1} de ${informe.imagenUrls.length}` : "Imagen adjunta",
      14,
      18,
    );

    const anchoMaximo = anchoPaginaImagen - 28;
    const altoMaximo = altoPagina - 34;
    const escala = Math.min(anchoMaximo / imagen.ancho, altoMaximo / imagen.alto, 1);
    const anchoFinal = imagen.ancho * escala;
    const altoFinal = imagen.alto * escala;
    doc.addImage(imagen.dataUrl, "PNG", 14, 26, anchoFinal, altoFinal);
  }

  doc.save(`${nombreArchivoInformeCampo(informe.cliente, informe.fecha)}.pdf`);
}

// Datos fiscales para el membrete del Informe Diario -- documento formal
// que se envía al cliente, con RUC/DV en vez del teléfono/correo/dirección
// que usan Factura/Talonario/Orden de Compra (boceto exacto dado por el
// cliente).
const AGRO_SKY_FISCAL = {
  nombre: "AGRO SKY CORP.",
  ruc: "155743477-2-2023",
  dv: "21",
};

export type InformeDiarioExportable = {
  // "Nombre" en el documento -- es el cliente del Informe de Campo (ej.
  // "Ingenio Santa Rosa"), no quién voló el drone.
  cliente: string;
  fecha: string;
  hectareasAplicadas: number;
  tipoAplicacion: string;
  dosis: string;
  boquillas: string;
  alturaVuelo: string;
  anchoPases: string;
  velocidad: string;
  nota: string | null;
  informeCampo: InformeCampoExportable;
};

function nombreArchivoInformeDiario(cliente: string, fecha: string): string {
  return `agro-sky-informe-diario-${cliente.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${fecha}`;
}

// Informe Diario: documento puramente informativo para el cliente (no
// tiene relación con el pago de los trabajadores) que arma el
// administrador tomando datos del Informe de Campo correspondiente.
// Siempre lleva, en páginas aparte: 1) los campos técnicos que llenó el
// administrador, 2) una copia completa del Informe de Campo vinculado
// (mismo dibujo que exportarInformeCampoPDF, vía dibujarCuerpoInformeCampo)
// y 3) si se adjuntó, la captura de pantalla del control del drone.
export async function exportarInformeDiarioPDF(informe: InformeDiarioExportable) {
  const doc = new jsPDF({ orientation: "portrait" });
  const anchoPagina = doc.internal.pageSize.getWidth();

  let yEmpresa = 14;
  const logoBase64 = await cargarLogoBase64();
  if (logoBase64) {
    const logoAlto = 20;
    const logoAncho = logoAlto * LOGO_ASPECTO;
    doc.addImage(logoBase64, "PNG", 14, yEmpresa, logoAncho, logoAlto);
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(AGRO_SKY_FISCAL.nombre, anchoPagina / 2 + 12, yEmpresa + 9, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `R.U.C. ${AGRO_SKY_FISCAL.ruc}    D.V. ${AGRO_SKY_FISCAL.dv}`,
    anchoPagina / 2 + 12,
    yEmpresa + 17,
    { align: "center" },
  );
  yEmpresa += 26;

  doc.setDrawColor(21, 128, 61);
  doc.line(14, yEmpresa, anchoPagina - 14, yEmpresa);
  yEmpresa += 10;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Informe Diario", 14, yEmpresa);
  yEmpresa += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = yEmpresa;
  for (const linea of [
    `Nombre: ${informe.cliente}`,
    `Fecha: ${formatDateOnly(informe.fecha)}`,
    `Hectáreas Aplicadas: ${informe.hectareasAplicadas}`,
    `Tipo de Aplicación: ${informe.tipoAplicacion || "—"}`,
    `Dosis: ${informe.dosis}`,
    `Boquillas: ${informe.boquillas || "—"}`,
    `Altura de Vuelo: ${informe.alturaVuelo || "—"}`,
    `Ancho de Pases: ${informe.anchoPases || "—"}`,
    `Velocidad: ${informe.velocidad || "—"}`,
  ]) {
    doc.text(linea, 14, y);
    y += 6;
  }
  if (informe.nota) {
    const lineasNota = doc.splitTextToSize(`Nota: ${informe.nota}`, anchoPagina - 28) as string[];
    doc.text(lineasNota, 14, y);
    y += lineasNota.length * 6;
  }

  // Copia del Informe de Campo -- los campos de arriba (llenados a mano
  // por el administrador) casi siempre dejan mucho espacio libre en la
  // primera hoja, así que la copia arranca en esa misma hoja si alcanza
  // el espacio (título + sus líneas de info, antes de la tabla de
  // parcelas -- esa y las firmas ya se paginan solas dentro de
  // dibujarCuerpoInformeCampo). Solo se fuerza una hoja nueva si de
  // verdad no cabe.
  const altoPagina = doc.internal.pageSize.getHeight();
  const espacioMinimoCopia = 90;
  if (altoPagina - y < espacioMinimoCopia) {
    doc.addPage();
    y = 18;
  } else {
    y += 10;
  }
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Copia del Informe de Campo", 14, y);
  await dibujarCuerpoInformeCampo(doc, informe.informeCampo, y + 10, 0);

  doc.save(`${nombreArchivoInformeDiario(informe.cliente, informe.fecha)}.pdf`);
}
