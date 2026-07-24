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

export type MovimientoExportable = {
  fecha: string;
  tipo: "gasto" | "reposicion";
  categoria: string | null;
  nombre: string | null;
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
