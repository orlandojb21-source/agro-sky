import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney } from "@/lib/format";

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
