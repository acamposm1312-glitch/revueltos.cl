import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  SEED DATA — importado desde Ventas.xlsx (Drive · carpeta Wine&Co)  */
/* ------------------------------------------------------------------ */
const SEED_PEDIDOS = [{"id": "hist-1", "fechaOrdenCompra": "2023-08-21", "fechaEntrega": "", "fechaPagoFactura": "2023-08-21", "numeroFactura": "123", "facturaLink": "", "cliente": "M&M", "montoVenta": 4037325, "montoComision": 1840000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-2", "fechaOrdenCompra": "2023-08-21", "fechaEntrega": "", "fechaPagoFactura": "2023-08-21", "numeroFactura": "121", "facturaLink": "", "cliente": "M&M", "montoVenta": 3195908, "montoComision": 0, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-3", "fechaOrdenCompra": "2023-08-21", "fechaEntrega": "", "fechaPagoFactura": "2023-08-21", "numeroFactura": "122", "facturaLink": "", "cliente": "M&M", "montoVenta": 7027451, "montoComision": 0, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-4", "fechaOrdenCompra": "2023-08-24", "fechaEntrega": "", "fechaPagoFactura": "2023-08-24", "numeroFactura": "", "facturaLink": "", "cliente": "Héctor Aranda", "montoVenta": 2640560, "montoComision": 482800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-5", "fechaOrdenCompra": "2023-09-05", "fechaEntrega": "", "fechaPagoFactura": "2023-09-05", "numeroFactura": "", "facturaLink": "", "cliente": "Héctor Aranda", "montoVenta": 2851800, "montoComision": 512800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-6", "fechaOrdenCompra": "2023-09-06", "fechaEntrega": "", "fechaPagoFactura": "2023-09-06", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 16473600, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-7", "fechaOrdenCompra": "2023-11-16", "fechaEntrega": "", "fechaPagoFactura": "2023-11-16", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 16473600, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-8", "fechaOrdenCompra": "2023-11-10", "fechaEntrega": "", "fechaPagoFactura": "2023-11-10", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 10782519, "montoComision": 1281000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-9", "fechaOrdenCompra": "2024-01-12", "fechaEntrega": "", "fechaPagoFactura": "2024-01-12", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 16473600, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-10", "fechaOrdenCompra": "2024-04-11", "fechaEntrega": "", "fechaPagoFactura": "2024-04-11", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 11848650, "montoComision": 1436200, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-11", "fechaOrdenCompra": "2024-05-07", "fechaEntrega": "", "fechaPagoFactura": "2024-05-07", "numeroFactura": "", "facturaLink": "", "cliente": "Pachi Pap", "montoVenta": 2424000, "montoComision": 432000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-12", "fechaOrdenCompra": "2024-05-08", "fechaEntrega": "", "fechaPagoFactura": "2024-05-08", "numeroFactura": "", "facturaLink": "", "cliente": "Pachi Pap", "montoVenta": 2424000, "montoComision": 432000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-13", "fechaOrdenCompra": "2024-04-30", "fechaEntrega": "", "fechaPagoFactura": "2024-04-30", "numeroFactura": "", "facturaLink": "", "cliente": "Super Oferta", "montoVenta": 2520000, "montoComision": 240000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-14", "fechaOrdenCompra": "2024-05-09", "fechaEntrega": "", "fechaPagoFactura": "2024-05-09", "numeroFactura": "", "facturaLink": "", "cliente": "Héctor Aranda", "montoVenta": 1737600, "montoComision": 297600, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-15", "fechaOrdenCompra": "2024-05-08", "fechaEntrega": "", "fechaPagoFactura": "2024-05-08", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 4656000, "montoComision": 720000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-16", "fechaOrdenCompra": "2024-07-10", "fechaEntrega": "", "fechaPagoFactura": "2024-07-10", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 6984000, "montoComision": 1080000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-17", "fechaOrdenCompra": "2024-07-10", "fechaEntrega": "", "fechaPagoFactura": "2024-07-10", "numeroFactura": "", "facturaLink": "", "cliente": "Pachi Pap", "montoVenta": 2688000, "montoComision": 504000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-18", "fechaOrdenCompra": "2024-07-10", "fechaEntrega": "", "fechaPagoFactura": "2024-07-10", "numeroFactura": "", "facturaLink": "", "cliente": "Pachi Pap", "montoVenta": 1992000, "montoComision": 360000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-19", "fechaOrdenCompra": "2024-07-10", "fechaEntrega": "", "fechaPagoFactura": "2024-07-10", "numeroFactura": "", "facturaLink": "", "cliente": "Ekomas", "montoVenta": 524999, "montoComision": 75000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-20", "fechaOrdenCompra": "2024-07-12", "fechaEntrega": "", "fechaPagoFactura": "2024-07-12", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 16473600, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-21", "fechaOrdenCompra": "2024-07-10", "fechaEntrega": "", "fechaPagoFactura": "2024-07-10", "numeroFactura": "", "facturaLink": "", "cliente": "Héctor Aranda", "montoVenta": 1424280, "montoComision": 282000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-22", "fechaOrdenCompra": "2024-08-08", "fechaEntrega": "", "fechaPagoFactura": "2024-08-08", "numeroFactura": "", "facturaLink": "", "cliente": "Ekomas", "montoVenta": 15385819, "montoComision": 2048000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-23", "fechaOrdenCompra": "2024-08-16", "fechaEntrega": "", "fechaPagoFactura": "2024-08-16", "numeroFactura": "", "facturaLink": "https://drive.google.com/file/d/1oMneUH5U7CDIBRSHOkHuxuX8f75Gu_E7/view?usp=drive_link", "cliente": "El Trebol", "montoVenta": 16473600, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-24", "fechaOrdenCompra": "2024-08-19", "fechaEntrega": "", "fechaPagoFactura": "2024-08-19", "numeroFactura": "", "facturaLink": "https://drive.google.com/file/d/1Bn9ws-ziABJdNV8sOdyyea_lAuBuNgy7/view?usp=drive_link", "cliente": "El Trebol", "montoVenta": 9751943, "montoComision": 1712000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-25", "fechaOrdenCompra": "2024-08-14", "fechaEntrega": "", "fechaPagoFactura": "2024-08-14", "numeroFactura": "", "facturaLink": "https://drive.google.com/file/d/1y38VjBoxPgTHXMva2LKMtw7lOF1D3s2j/view?usp=drive_link", "cliente": "M&M", "montoVenta": 11447989, "montoComision": 1800000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-26", "fechaOrdenCompra": "2024-08-19", "fechaEntrega": "", "fechaPagoFactura": "2024-08-19", "numeroFactura": "", "facturaLink": "https://drive.google.com/file/d/162H9qQylSLT0ypWqm8dUYZcXa6wrg5o7/view?usp=drive_link", "cliente": "Héctor Aranda", "montoVenta": 1737600, "montoComision": 297600, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-27", "fechaOrdenCompra": "2024-08-29", "fechaEntrega": "", "fechaPagoFactura": "2024-08-29", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 8157882, "montoComision": 1374900, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-28", "fechaOrdenCompra": "2024-09-16", "fechaEntrega": "", "fechaPagoFactura": "2024-09-16", "numeroFactura": "", "facturaLink": "", "cliente": "El manzano", "montoVenta": 960000, "montoComision": 240000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-29", "fechaOrdenCompra": "2024-09-09", "fechaEntrega": "", "fechaPagoFactura": "2024-09-09", "numeroFactura": "", "facturaLink": "https://drive.google.com/file/d/1vYoydOnYusIT9OhlGNkxEPPW5jU_zkde/view?usp=drive_link", "cliente": "M&M", "montoVenta": 2923585, "montoComision": 512000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-30", "fechaOrdenCompra": "2024-09-10", "fechaEntrega": "", "fechaPagoFactura": "2024-09-10", "numeroFactura": "", "facturaLink": "https://drive.google.com/file/d/1TsVvuSSS7oPBu1iOofOaaSchCl0FgV-n/view?usp=drive_link", "cliente": "M&M", "montoVenta": 1033995, "montoComision": 176000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-31", "fechaOrdenCompra": "2024-09-12", "fechaEntrega": "", "fechaPagoFactura": "2024-09-12", "numeroFactura": "", "facturaLink": "https://drive.google.com/file/d/1sgXV_o_Cr7bERNyvL58naMsYdhgdSsln/view?usp=drive_link", "cliente": "El Trebol", "montoVenta": 16473600, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-32", "fechaOrdenCompra": "2024-10-23", "fechaEntrega": "", "fechaPagoFactura": "2024-10-23", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 6336000, "montoComision": 960000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-33", "fechaOrdenCompra": "2024-10-23", "fechaEntrega": "", "fechaPagoFactura": "2024-10-23", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 3168000, "montoComision": 480000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-34", "fechaOrdenCompra": "2024-10-23", "fechaEntrega": "", "fechaPagoFactura": "2024-10-23", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 3168000, "montoComision": 480000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-35", "fechaOrdenCompra": "2024-10-23", "fechaEntrega": "", "fechaPagoFactura": "2024-10-23", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 3168000, "montoComision": 480000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-36", "fechaOrdenCompra": "2024-10-23", "fechaEntrega": "", "fechaPagoFactura": "2024-10-23", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 7743000, "montoComision": 450000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-37", "fechaOrdenCompra": "2024-10-11", "fechaEntrega": "", "fechaPagoFactura": "2024-10-11", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 16473600, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-38", "fechaOrdenCompra": "2024-11-22", "fechaEntrega": "", "fechaPagoFactura": "2024-11-22", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 16473600, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-39", "fechaOrdenCompra": "2024-12-16", "fechaEntrega": "", "fechaPagoFactura": "2024-12-16", "numeroFactura": "", "facturaLink": "", "cliente": "Ekomas", "montoVenta": 7983333, "montoComision": 998400, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-40", "fechaOrdenCompra": "2024-12-16", "fechaEntrega": "", "fechaPagoFactura": "2024-12-16", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 5987499, "montoComision": 748800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-41", "fechaOrdenCompra": "2024-12-30", "fechaEntrega": "", "fechaPagoFactura": "2024-12-30", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18969800, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-42", "fechaOrdenCompra": "2025-02-21", "fechaEntrega": "", "fechaPagoFactura": "2025-02-21", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18969800, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-43", "fechaOrdenCompra": "2025-03-10", "fechaEntrega": "", "fechaPagoFactura": "2025-03-10", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 10857600, "montoComision": 1459200, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-44", "fechaOrdenCompra": "2025-03-14", "fechaEntrega": "", "fechaPagoFactura": "2025-03-14", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18969800, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-45", "fechaOrdenCompra": "2025-04-09", "fechaEntrega": "", "fechaPagoFactura": "2025-04-09", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18969800, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-46", "fechaOrdenCompra": "2025-05-15", "fechaEntrega": "", "fechaPagoFactura": "2025-05-15", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 9372251, "montoComision": 1329600, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-47", "fechaOrdenCompra": "2025-05-30", "fechaEntrega": "", "fechaPagoFactura": "2025-05-30", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18969800, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-48", "fechaOrdenCompra": "2025-06-12", "fechaEntrega": "", "fechaPagoFactura": "2025-06-12", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 10584000, "montoComision": 1440000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-49", "fechaOrdenCompra": "2025-06-23", "fechaEntrega": "", "fechaPagoFactura": "2025-06-23", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18969800, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-50", "fechaOrdenCompra": "2025-07-04", "fechaEntrega": "", "fechaPagoFactura": "2025-07-04", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18969800, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-51", "fechaOrdenCompra": "2025-07-21", "fechaEntrega": "", "fechaPagoFactura": "2025-07-21", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18996800, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-52", "fechaOrdenCompra": "2025-07-31", "fechaEntrega": "", "fechaPagoFactura": "2025-07-31", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 10584000, "montoComision": 1440000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-53", "fechaOrdenCompra": "2025-07-31", "fechaEntrega": "", "fechaPagoFactura": "2025-07-31", "numeroFactura": "", "facturaLink": "", "cliente": "Ekomas", "montoVenta": 955996, "montoComision": 150000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-54", "fechaOrdenCompra": "2025-08-14", "fechaEntrega": "", "fechaPagoFactura": "2025-08-14", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 2719200, "montoComision": 491200, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-55", "fechaOrdenCompra": "2025-08-14", "fechaEntrega": "", "fechaPagoFactura": "2025-08-14", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 14903900, "montoComision": 2602700, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-56", "fechaOrdenCompra": "2025-09-03", "fechaEntrega": "", "fechaPagoFactura": "2025-09-03", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18996800, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-57", "fechaOrdenCompra": "2025-09-01", "fechaEntrega": "", "fechaPagoFactura": "2025-09-01", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 7776000, "montoComision": 1080000, "estadoFactura": "Pagado", "estadoComision": "Pendiente", "comisionTitinPagada": "Pendiente"}, {"id": "hist-58", "fechaOrdenCompra": "2025-09-01", "fechaEntrega": "", "fechaPagoFactura": "2025-09-01", "numeroFactura": "", "facturaLink": "", "cliente": "Ekomas", "montoVenta": 819000, "montoComision": 105000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-59", "fechaOrdenCompra": "2025-09-09", "fechaEntrega": "", "fechaPagoFactura": "2025-09-09", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 4423600, "montoComision": 707200, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-60", "fechaOrdenCompra": "2025-09-09", "fechaEntrega": "", "fechaPagoFactura": "2025-09-09", "numeroFactura": "", "facturaLink": "", "cliente": "Sin especificar", "montoVenta": 1008000, "montoComision": 192000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-61", "fechaOrdenCompra": "2025-10-28", "fechaEntrega": "", "fechaPagoFactura": "2025-10-28", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 8956800, "montoComision": 1209600, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-62", "fechaOrdenCompra": "2025-10-28", "fechaEntrega": "", "fechaPagoFactura": "2025-10-28", "numeroFactura": "", "facturaLink": "", "cliente": "Ekomas", "montoVenta": 1111500, "montoComision": 142500, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-63", "fechaOrdenCompra": "2025-10-15", "fechaEntrega": "", "fechaPagoFactura": "2025-10-15", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18996800, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-64", "fechaOrdenCompra": "2025-12-03", "fechaEntrega": "", "fechaPagoFactura": "2025-12-03", "numeroFactura": "", "facturaLink": "", "cliente": "Ekomas", "montoVenta": 1169998, "montoComision": 150000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-65", "fechaOrdenCompra": "2025-12-03", "fechaEntrega": "", "fechaPagoFactura": "2025-12-03", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18969600, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-66", "fechaOrdenCompra": "2025-12-03", "fechaEntrega": "", "fechaPagoFactura": "2025-12-03", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 7776000, "montoComision": 1080000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-67", "fechaOrdenCompra": "2026-01-09", "fechaEntrega": "", "fechaPagoFactura": "2026-01-09", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18996800, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-68", "fechaOrdenCompra": "2026-03-02", "fechaEntrega": "", "fechaPagoFactura": "", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18996800, "montoComision": 1996800, "estadoFactura": "Pendiente", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-69", "fechaOrdenCompra": "2026-01-21", "fechaEntrega": "", "fechaPagoFactura": "2026-01-21", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 4475000, "montoComision": 447500, "estadoFactura": "Pagado", "estadoComision": "Pendiente", "comisionTitinPagada": "Pendiente"}, {"id": "hist-70", "fechaOrdenCompra": "2026-01-21", "fechaEntrega": "", "fechaPagoFactura": "2026-01-21", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 7056000, "montoComision": 960000, "estadoFactura": "Pagado", "estadoComision": "Pagado", "comisionTitinPagada": "Pagado"}, {"id": "hist-71", "fechaOrdenCompra": "2026-03-20", "fechaEntrega": "", "fechaPagoFactura": "2026-03-20", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 9051840, "montoComision": 1459200, "estadoFactura": "Pagado", "estadoComision": "Pendiente", "comisionTitinPagada": "Pendiente"}, {"id": "hist-72", "fechaOrdenCompra": "2026-03-30", "fechaEntrega": "", "fechaPagoFactura": "2026-03-30", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18996800, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pendiente", "comisionTitinPagada": "Pendiente"}, {"id": "hist-73", "fechaOrdenCompra": "2026-04-01", "fechaEntrega": "", "fechaPagoFactura": "2026-04-01", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 997920, "montoComision": 131040, "estadoFactura": "Pagado", "estadoComision": "Pendiente", "comisionTitinPagada": "Pendiente"}, {"id": "hist-74", "fechaOrdenCompra": "2026-04-14", "fechaEntrega": "", "fechaPagoFactura": "2026-04-14", "numeroFactura": "", "facturaLink": "", "cliente": "Ekomas", "montoVenta": 1521000, "montoComision": 195000, "estadoFactura": "Pagado", "estadoComision": "Pendiente", "comisionTitinPagada": "Pendiente"}, {"id": "hist-75", "fechaOrdenCompra": "2026-05-04", "fechaEntrega": "", "fechaPagoFactura": "2026-05-04", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18996800, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pendiente", "comisionTitinPagada": "Pendiente"}, {"id": "hist-76", "fechaOrdenCompra": "2026-06-01", "fechaEntrega": "", "fechaPagoFactura": "2026-06-01", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18996800, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pendiente", "comisionTitinPagada": "Pendiente"}, {"id": "hist-77", "fechaOrdenCompra": "2026-06-26", "fechaEntrega": "", "fechaPagoFactura": "2026-06-26", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18996800, "montoComision": 1996800, "estadoFactura": "Pagado", "estadoComision": "Pendiente", "comisionTitinPagada": "Pendiente"}, {"id": "hist-78", "fechaOrdenCompra": "2026-07-09", "fechaEntrega": "", "fechaPagoFactura": "", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18996800, "montoComision": 1996800, "estadoFactura": "Pendiente", "estadoComision": "Pendiente", "comisionTitinPagada": "Pendiente"}, {"id": "hist-79", "fechaOrdenCompra": "2026-07-24", "fechaEntrega": "", "fechaPagoFactura": "", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18996800, "montoComision": 1996800, "estadoFactura": "Pendiente", "estadoComision": "Pendiente", "comisionTitinPagada": "Pendiente"}, {"id": "hist-80", "fechaOrdenCompra": "2026-07-30", "fechaEntrega": "", "fechaPagoFactura": "2026-07-30", "numeroFactura": "", "facturaLink": "", "cliente": "M&M", "montoVenta": 5936400, "montoComision": 840000, "estadoFactura": "Pagado", "estadoComision": "Pendiente", "comisionTitinPagada": "Pendiente"}, {"id": "hist-81", "fechaOrdenCompra": "2026-08-12", "fechaEntrega": "", "fechaPagoFactura": "", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 16441000, "montoComision": 2869000, "estadoFactura": "Pendiente", "estadoComision": "Pendiente", "comisionTitinPagada": "Pendiente"}, {"id": "hist-82", "fechaOrdenCompra": "2026-08-14", "fechaEntrega": "", "fechaPagoFactura": "", "numeroFactura": "", "facturaLink": "", "cliente": "El Trebol", "montoVenta": 18996800, "montoComision": 1996800, "estadoFactura": "Pendiente", "estadoComision": "Pendiente", "comisionTitinPagada": "Pendiente"}];

const SEED_GASTOS = { sueldos: [], mercaderistas: [], otros: [] };

/* ------------------------------------------------------------------ */
/*  UTILIDADES                                                         */
/* ------------------------------------------------------------------ */
const CLP = (n) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
};

const monthKey = (iso) => (iso ? iso.slice(0, 7) : null);
const monthLabel = (key) => {
  if (!key) return "";
  const [y, m] = key.split("-");
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${meses[parseInt(m, 10) - 1]} ${y.slice(2)}`;
};

const uid = () => `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);

/* ------------------------------------------------------------------ */
/*  ÍCONOS (inline SVG, sin dependencias)                              */
/* ------------------------------------------------------------------ */
const Icon = ({ path, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);
const IconGrape = (p) => <Icon {...p} path={<><circle cx="12" cy="6" r="2.4"/><circle cx="8" cy="10" r="2.4"/><circle cx="16" cy="10" r="2.4"/><circle cx="6" cy="14.5" r="2.4"/><circle cx="12" cy="14.5" r="2.4"/><circle cx="18" cy="14.5" r="2.4"/><circle cx="9" cy="19" r="2.4"/><circle cx="15" cy="19" r="2.4"/><path d="M12 6V2"/></>} />;
const IconBox = (p) => <Icon {...p} path={<><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></>} />;
const IconCoins = (p) => <Icon {...p} path={<><ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M3 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M15 10.2c2.9.4 5 1.5 5 2.8s-2.1 2.4-5 2.8"/><path d="M15 15v2c0 1.3 2.1 2.4 5 2.8v-5"/></>} />;
const IconChart = (p) => <Icon {...p} path={<><path d="M4 20V10"/><path d="M11 20V4"/><path d="M18 20v-7"/></>} />;
const IconPlus = (p) => <Icon {...p} path={<><path d="M12 5v14"/><path d="M5 12h14"/></>} />;
const IconSeal = (p) => <Icon {...p} path={<><circle cx="12" cy="9" r="6.5"/><path d="M8.5 14.5L6 22l6-3.2L18 22l-2.5-7.5"/></>} />;
const IconTrash = (p) => <Icon {...p} path={<><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></>} />;
const IconTrophy = (p) => <Icon {...p} path={<><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v6a5 5 0 01-10 0V4z"/><path d="M7 5H4a3 3 0 003 5"/><path d="M17 5h3a3 3 0 01-3 5"/></>} />;
const IconClose = (p) => <Icon {...p} path={<><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>} />;
const IconFile = (p) => <Icon {...p} path={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></>} />;
const IconTruck = (p) => <Icon {...p} path={<><path d="M2 8h11v8H2z"/><path d="M13 11h4l3 3v2h-7z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></>} />;

/* ------------------------------------------------------------------ */
/*  APP                                                                 */
/* ------------------------------------------------------------------ */
const STORAGE_KEY_PEDIDOS = "wineco.pedidos";
const STORAGE_KEY_GASTOS = "wineco.gastos";

export default function App() {
  const [tab, setTab] = useState("pedidos");
  const [pedidos, setPedidos] = useState(SEED_PEDIDOS);
  const [gastos, setGastos] = useState(SEED_GASTOS);
  const [loaded, setLoaded] = useState(false);
  // saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'unavailable'
  const [saveStatus, setSaveStatus] = useState("idle");

  useEffect(() => {
    try {
      const p = localStorage.getItem(STORAGE_KEY_PEDIDOS);
      const g = localStorage.getItem(STORAGE_KEY_GASTOS);
      if (p) setPedidos(JSON.parse(p));
      if (g) setGastos(JSON.parse(g));
    } catch (e) {
      console.error("Error cargando datos", e);
      setSaveStatus("unavailable");
    } finally {
      setLoaded(true);
    }
  }, []);

  const persist = useCallback((key, value) => {
    try {
      setSaveStatus("saving");
      localStorage.setItem(key, JSON.stringify(value));
      setSaveStatus("saved");
    } catch (e) {
      console.error("Error guardando", key, e);
      setSaveStatus("error");
    }
  }, []);

  useEffect(() => { if (loaded) persist(STORAGE_KEY_PEDIDOS, pedidos); }, [pedidos, loaded, persist]);
  useEffect(() => { if (loaded) persist(STORAGE_KEY_GASTOS, gastos); }, [gastos, loaded, persist]);

  const updatePedido = useCallback((id, patch) => {
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const exportBackup = useCallback(() => {
    const payload = JSON.stringify({ pedidos, gastos, exportadoEl: new Date().toISOString() }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wine-co-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [pedidos, gastos]);

  const importBackup = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.pedidos) setPedidos(data.pedidos);
        if (data.gastos) setGastos(data.gastos);
      } catch (err) {
        console.error("Archivo de respaldo inválido", err);
        alert("Este archivo no parece un respaldo válido de Wine&Co.");
      }
    };
    reader.readAsText(file);
  }, []);

  return (
    <div style={S.app} className="wc-app">
      <style>{FONT_IMPORT}</style>
      <Sidebar tab={tab} setTab={setTab} saveStatus={saveStatus} onExport={exportBackup} onImport={importBackup} />
      <main style={S.main} className="wc-main">
        {(saveStatus === "error" || saveStatus === "unavailable") && (
          <div style={S.warnBanner}>
            {saveStatus === "unavailable"
              ? "El almacenamiento del navegador no está disponible en esta vista (por ejemplo, modo incógnito). Usa \"Descargar respaldo\" en el menú antes de salir, y \"Cargar respaldo\" la próxima vez que entres."
              : "No se pudo guardar en este navegador. Usa \"Descargar respaldo\" en el menú para no perder tus cambios."}
          </div>
        )}
        {tab === "pedidos" && <PedidosPanel pedidos={pedidos} setPedidos={setPedidos} updatePedido={updatePedido} />}
        {tab === "gastos" && <GastosPanel gastos={gastos} setGastos={setGastos} />}
        {tab === "resultados" && <ResultadosPanel pedidos={pedidos} gastos={gastos} />}
      </main>
    </div>
  );
}

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');
* { box-sizing: border-box; }
::selection { background: #8C2E4C; color: #fff; }
input:focus, select:focus, textarea:focus, button:focus-visible {
  outline: 2px solid #B8935A; outline-offset: 1px;
}
@media (max-width: 780px) {
  .wc-app { flex-direction: column !important; }
  .wc-sidebar { width: 100% !important; height: auto !important; position: relative !important; top: auto !important; padding: 16px !important; }
  .wc-sidebar-brand { padding-bottom: 14px !important; margin-bottom: 12px !important; }
  .wc-nav { flex-direction: row !important; overflow-x: auto; gap: 8px !important; padding-bottom: 2px; }
  .wc-nav-item { flex-direction: column !important; align-items: center !important; text-align: center !important; min-width: 84px; gap: 4px !important; padding: 8px 6px !important; }
  .wc-nav-sub { display: none !important; }
  .wc-sidebar-footer { display: none !important; }
  .wc-mobile-actions { display: flex !important; }
  .wc-main { padding: 20px 16px 40px !important; }
  .wc-stats { grid-template-columns: repeat(2, 1fr) !important; }
  .wc-two-col { grid-template-columns: 1fr !important; }
  .wc-form-grid { grid-template-columns: 1fr !important; }
  .wc-dynamic-grid { grid-template-columns: 1fr !important; }
  .wc-table-wrap { overflow-x: auto !important; }
  .wc-table-wrap table { min-width: 760px; }
  .wc-drawer { width: 100% !important; max-width: 100% !important; }
  .wc-rank-row { grid-template-columns: 1fr !important; gap: 6px !important; }
  .wc-rank-value { text-align: left !important; }
}
`;

/* ------------------------------------------------------------------ */
/*  SIDEBAR                                                             */
/* ------------------------------------------------------------------ */
function Sidebar({ tab, setTab, saveStatus, onExport, onImport }) {
  const items = [
    { id: "pedidos", label: "Pedidos", sub: "Ventas & comisiones", icon: IconBox },
    { id: "gastos", label: "Gastos", sub: "Sueldos & costos", icon: IconCoins },
    { id: "resultados", label: "Resultados", sub: "Panel & evolutivo", icon: IconChart },
  ];
  const fileInputRef = React.useRef(null);

  return (
    <aside style={S.sidebar} className="wc-sidebar">
      <div style={S.brand} className="wc-sidebar-brand">
        <div style={S.brandMark}><IconGrape size={22} /></div>
        <div>
          <div style={S.brandName}>Wine&amp;Co</div>
          <div style={S.brandSub}>Gestión de ventas al por mayor</div>
        </div>
      </div>

      <nav style={S.nav} className="wc-nav">
        {items.map((it) => {
          const Ic = it.icon;
          const active = tab === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              style={{ ...S.navItem, ...(active ? S.navItemActive : {}) }}
              className="wc-nav-item"
            >
              <span style={{ ...S.navIcon, ...(active ? S.navIconActive : {}) }}><Ic size={17} /></span>
              <span>
                <div style={S.navLabel}>{it.label}</div>
                <div style={S.navSubLabel} className="wc-nav-sub">{it.sub}</div>
              </span>
            </button>
          );
        })}
      </nav>

      <div style={S.mobileActions} className="wc-mobile-actions">
        <button style={S.mobileActionBtn} onClick={onExport}>Descargar respaldo</button>
        <button style={S.mobileActionBtn} onClick={() => fileInputRef.current?.click()}>Cargar respaldo</button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files?.[0]) onImport(e.target.files[0]); e.target.value = ""; }}
        />
      </div>

      <div style={S.sidebarFooter} className="wc-sidebar-footer">
        <div style={S.saveDot(saveStatus)} />
        <span>{SAVE_LABEL[saveStatus] || SAVE_LABEL.idle}</span>
      </div>
    </aside>
  );
}

const SAVE_LABEL = {
  idle: "Datos cargados",
  saving: "Guardando…",
  saved: "Datos guardados",
  error: "Error al guardar",
  unavailable: "Sin almacenamiento",
};

/* ------------------------------------------------------------------ */
/*  PANEL: PEDIDOS                                                      */
/* ------------------------------------------------------------------ */
function PedidosPanel({ pedidos, setPedidos, updatePedido }) {
  const [showForm, setShowForm] = useState(false);
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [filtroTitin, setFiltroTitin] = useState("todos");
  const [editId, setEditId] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const clientes = useMemo(
    () => Array.from(new Set(pedidos.map((p) => p.cliente))).sort(),
    [pedidos]
  );

  const filtrados = useMemo(() => {
    return pedidos
      .filter((p) => filtroCliente === "todos" || p.cliente === filtroCliente)
      .filter((p) => filtroTitin === "todos" || p.comisionTitinPagada === filtroTitin)
      .sort((a, b) => (b.fechaOrdenCompra || "").localeCompare(a.fechaOrdenCompra || ""));
  }, [pedidos, filtroCliente, filtroTitin]);

  const totales = useMemo(() => {
    const venta = filtrados.reduce((s, p) => s + Number(p.montoVenta || 0), 0);
    const comision = filtrados.reduce((s, p) => s + Number(p.montoComision || 0), 0);
    const pendienteTitin = filtrados
      .filter((p) => p.comisionTitinPagada === "Pendiente")
      .reduce((s, p) => s + Number(p.montoComision || 0), 0);
    return { venta, comision, pendienteTitin, n: filtrados.length };
  }, [filtrados]);

  const editing = editId ? pedidos.find((p) => p.id === editId) : null;
  const detailPedido = detailId ? pedidos.find((p) => p.id === detailId) : null;

  const handleSave = (data) => {
    if (editing) {
      setPedidos((prev) => prev.map((p) => (p.id === editId ? { ...p, ...data } : p)));
    } else {
      setPedidos((prev) => [{ id: uid(), ...data }, ...prev]);
    }
    setShowForm(false);
    setEditId(null);
  };

  const handleDelete = (id) => {
    setPedidos((prev) => prev.filter((p) => p.id !== id));
    if (detailId === id) setDetailId(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Libro de pedidos"
        title="Pedidos"
        desc="Cada fila es una venta cerrada. Haz clic en una fila para abrir el detalle y actualizar el pago de la factura, de la comisión y de Titin."
        action={
          <button style={S.primaryBtn} onClick={() => { setEditId(null); setShowForm(true); }}>
            <IconPlus size={16} /> Nuevo pedido
          </button>
        }
      />

      <div style={S.statsRow} className="wc-stats">
        <StatCard label="Pedidos filtrados" value={totales.n} mono />
        <StatCard label="Venta total" value={CLP(totales.venta)} />
        <StatCard label="Comisión total" value={CLP(totales.comision)} accent="wine" />
        <StatCard label="Comisión Titin pendiente" value={CLP(totales.pendienteTitin)} accent="rust" />
      </div>

      <div style={S.filterBar}>
        <FilterSelect label="Cliente" value={filtroCliente} onChange={setFiltroCliente} options={["todos", ...clientes]} />
        <FilterSelect label="Comisión Titin" value={filtroTitin} onChange={setFiltroTitin} options={["todos", "Pagado", "Pendiente"]} />
      </div>

      {showForm && (
        <PedidoForm
          initial={editing}
          clientesExistentes={clientes}
          onCancel={() => { setShowForm(false); setEditId(null); }}
          onSave={handleSave}
        />
      )}

      <div style={S.tableWrap} className="wc-table-wrap">
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Cliente</th>
              <th style={S.th}>N° Factura</th>
              <th style={S.th}>Orden compra</th>
              <th style={{ ...S.th, textAlign: "right" }}>Venta</th>
              <th style={{ ...S.th, textAlign: "right" }}>Comisión</th>
              <th style={{ ...S.th, textAlign: "center" }}>Factura</th>
              <th style={{ ...S.th, textAlign: "center" }}>Comisión</th>
              <th style={{ ...S.th, textAlign: "center" }}>Titin</th>
              <th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => (
              <tr key={p.id} style={S.trClickable} onClick={() => setDetailId(p.id)}>
                <td style={S.tdStrong}>{p.cliente}</td>
                <td style={S.tdMono}>{p.numeroFactura || "—"}</td>
                <td style={S.tdMono}>{fmtDate(p.fechaOrdenCompra)}</td>
                <td style={{ ...S.tdMono, textAlign: "right" }}>{CLP(p.montoVenta)}</td>
                <td style={{ ...S.tdMono, textAlign: "right", color: "#8C2E4C", fontWeight: 600 }}>{CLP(p.montoComision)}</td>
                <td style={{ textAlign: "center" }}><MiniBadge status={p.estadoFactura} /></td>
                <td style={{ textAlign: "center" }}><MiniBadge status={p.estadoComision} /></td>
                <td style={{ textAlign: "center" }}><MiniBadge status={p.comisionTitinPagada} /></td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                  <button style={S.iconLink} onClick={() => setDetailId(p.id)}>Detalle</button>
                  <button style={{ ...S.iconLink, color: "#B5533C" }} onClick={() => handleDelete(p.id)}><IconTrash size={14} /></button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={9} style={S.emptyRow}>No hay pedidos que calcen con este filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {detailPedido && (
        <DetailDrawer
          pedido={detailPedido}
          onClose={() => setDetailId(null)}
          onUpdate={(patch) => updatePedido(detailPedido.id, patch)}
          onEdit={() => { setEditId(detailPedido.id); setShowForm(true); setDetailId(null); }}
          onDelete={() => handleDelete(detailPedido.id)}
        />
      )}
    </div>
  );
}

function MiniBadge({ status }) {
  const paid = status === "Pagado";
  return (
    <span style={S.miniBadge(paid)}>
      <span style={S.miniDot(paid)} />
      {status || "Pendiente"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  DETALLE DE VENTA (drawer lateral)                                   */
/* ------------------------------------------------------------------ */
function DetailDrawer({ pedido, onClose, onUpdate, onEdit, onDelete }) {
  const margen = pedido.montoVenta ? (pedido.montoComision / pedido.montoVenta) * 100 : 0;

  return (
    <div style={S.drawerOverlay} onClick={onClose}>
      <div style={S.drawer} className="wc-drawer" onClick={(e) => e.stopPropagation()}>
        <div style={S.drawerHead}>
          <div>
            <div style={S.drawerEyebrow}>Detalle de venta</div>
            <div style={S.drawerTitle}>{pedido.cliente}</div>
          </div>
          <button style={S.drawerClose} onClick={onClose}><IconClose size={18} /></button>
        </div>

        <div style={S.drawerAmounts}>
          <div>
            <div style={S.drawerAmountLabel}>Monto de venta</div>
            <div style={S.drawerAmountValue}>{CLP(pedido.montoVenta)}</div>
          </div>
          <div>
            <div style={S.drawerAmountLabel}>Comisión ({margen.toFixed(1)}%)</div>
            <div style={{ ...S.drawerAmountValue, color: "#8C2E4C" }}>{CLP(pedido.montoComision)}</div>
          </div>
        </div>

        <div style={S.drawerSection}>
          <div style={S.drawerSectionTitle}>Datos del pedido</div>
          <DetailRow icon={IconFile} label="N° de factura" value={pedido.numeroFactura || "Sin número"} />
          <DetailRow icon={IconBox} label="Fecha orden de compra" value={fmtDate(pedido.fechaOrdenCompra)} />
          <DetailRow icon={IconTruck} label="Fecha de entrega" value={fmtDate(pedido.fechaEntrega)} />
          <DetailRow icon={IconFile} label="Fecha de pago de factura" value={fmtDate(pedido.fechaPagoFactura)} />
          {pedido.facturaLink && (
            <a href={pedido.facturaLink} target="_blank" rel="noreferrer" style={S.drawerLink}>Ver factura adjunta ↗</a>
          )}
        </div>

        <div style={S.drawerSection}>
          <div style={S.drawerSectionTitle}>Estados de pago</div>
          <p style={S.drawerSectionHint}>Actualiza cada estado a medida que se van cerrando los pagos.</p>

          <StatusRow
            label="Pago de la factura"
            hint="¿El cliente ya pagó esta factura?"
            value={pedido.estadoFactura}
            onChange={(v) => onUpdate({ estadoFactura: v, fechaPagoFactura: v === "Pagado" && !pedido.fechaPagoFactura ? new Date().toISOString().slice(0, 10) : pedido.fechaPagoFactura })}
          />
          <StatusRow
            label="Pago de la comisión"
            hint="¿Ya se recibió/cobró la comisión de esta venta?"
            value={pedido.estadoComision}
            onChange={(v) => onUpdate({ estadoComision: v })}
          />
          <StatusRow
            label="Pago a Titin"
            hint="¿Ya se le pagó a Titin su parte de esta comisión?"
            value={pedido.comisionTitinPagada}
            onChange={(v) => onUpdate({ comisionTitinPagada: v })}
          />
        </div>

        <div style={S.drawerActions}>
          <button style={S.ghostBtn} onClick={onEdit}>Editar datos</button>
          <button style={{ ...S.ghostBtn, color: "#B5533C", borderColor: "#EBD2CB" }} onClick={onDelete}>Eliminar pedido</button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Ic, label, value }) {
  return (
    <div style={S.detailRow}>
      <span style={S.detailIcon}><Ic size={14} /></span>
      <span style={S.detailLabel}>{label}</span>
      <span style={S.detailValue}>{value}</span>
    </div>
  );
}

function StatusRow({ label, hint, value, onChange }) {
  const paid = value === "Pagado";
  return (
    <div style={S.statusRow}>
      <div>
        <div style={S.statusLabel}>{label}</div>
        <div style={S.statusHint}>{hint}</div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={S.statusSelect(paid)}
      >
        <option value="Pendiente">Pendiente</option>
        <option value="Pagado">Pagado</option>
      </select>
    </div>
  );
}

function PedidoForm({ initial, clientesExistentes, onCancel, onSave }) {
  const [f, setF] = useState(() => ({
    cliente: initial?.cliente || "",
    numeroFactura: initial?.numeroFactura || "",
    fechaOrdenCompra: initial?.fechaOrdenCompra || "",
    fechaEntrega: initial?.fechaEntrega || "",
    fechaPagoFactura: initial?.fechaPagoFactura || "",
    montoVenta: initial?.montoVenta ?? "",
    montoComision: initial?.montoComision ?? "",
    estadoFactura: initial?.estadoFactura || "Pendiente",
    estadoComision: initial?.estadoComision || "Pendiente",
    comisionTitinPagada: initial?.comisionTitinPagada || "Pendiente",
    facturaLink: initial?.facturaLink || "",
  }));

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.cliente || !f.fechaOrdenCompra || !f.montoVenta) return;
    onSave({
      ...f,
      montoVenta: Number(f.montoVenta) || 0,
      montoComision: Number(f.montoComision) || 0,
    });
  };

  return (
    <form onSubmit={submit} style={S.formCard}>
      <div style={S.formGrid} className="wc-form-grid">
        <Field label="Cliente" required>
          <input list="clientes-list" style={S.input} value={f.cliente} onChange={set("cliente")} placeholder="Ej: El Trebol" />
          <datalist id="clientes-list">
            {clientesExistentes.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="N° de factura">
          <input style={S.input} value={f.numeroFactura} onChange={set("numeroFactura")} placeholder="Ej: 128" />
        </Field>
        <Field label="Fecha orden de compra" required>
          <input type="date" style={S.input} value={f.fechaOrdenCompra} onChange={set("fechaOrdenCompra")} />
        </Field>
        <Field label="Fecha de entrega">
          <input type="date" style={S.input} value={f.fechaEntrega} onChange={set("fechaEntrega")} />
        </Field>
        <Field label="Fecha de pago de factura">
          <input type="date" style={S.input} value={f.fechaPagoFactura} onChange={set("fechaPagoFactura")} />
        </Field>
        <Field label="Monto de venta (CLP)" required>
          <input type="number" min="0" style={S.input} value={f.montoVenta} onChange={set("montoVenta")} placeholder="0" />
        </Field>
        <Field label="Comisión asociada (CLP)">
          <input type="number" min="0" style={S.input} value={f.montoComision} onChange={set("montoComision")} placeholder="0" />
        </Field>
        <Field label="Pago de la factura">
          <select style={S.input} value={f.estadoFactura} onChange={set("estadoFactura")}>
            <option value="Pendiente">Pendiente</option>
            <option value="Pagado">Pagado</option>
          </select>
        </Field>
        <Field label="Pago de la comisión">
          <select style={S.input} value={f.estadoComision} onChange={set("estadoComision")}>
            <option value="Pendiente">Pendiente</option>
            <option value="Pagado">Pagado</option>
          </select>
        </Field>
        <Field label="Pago a Titin">
          <select style={S.input} value={f.comisionTitinPagada} onChange={set("comisionTitinPagada")}>
            <option value="Pendiente">Pendiente</option>
            <option value="Pagado">Pagado</option>
          </select>
        </Field>
        <Field label="Link factura (opcional)">
          <input style={S.input} value={f.facturaLink} onChange={set("facturaLink")} placeholder="https://drive.google.com/..." />
        </Field>
      </div>
      <div style={S.formActions}>
        <button type="button" style={S.ghostBtn} onClick={onCancel}>Cancelar</button>
        <button type="submit" style={S.primaryBtn}>Guardar pedido</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  PANEL: GASTOS                                                       */
/* ------------------------------------------------------------------ */
function GastosPanel({ gastos, setGastos }) {
  const [openForm, setOpenForm] = useState(null);

  const addItem = (tipo, item) => {
    setGastos((g) => ({ ...g, [tipo]: [{ id: uid(), ...item }, ...g[tipo]] }));
    setOpenForm(null);
  };
  const removeItem = (tipo, id) => {
    setGastos((g) => ({ ...g, [tipo]: g[tipo].filter((x) => x.id !== id) }));
  };

  const totalSueldos = gastos.sueldos.reduce((s, x) => s + Number(x.monto || 0), 0);
  const totalMercaderistas = gastos.mercaderistas.reduce((s, x) => s + Number(x.monto || 0), 0);
  const totalOtros = gastos.otros.reduce((s, x) => s + Number(x.monto || 0), 0);
  const totalGeneral = totalSueldos + totalMercaderistas + totalOtros;

  return (
    <div>
      <PageHeader
        eyebrow="Costos del negocio"
        title="Gastos"
        desc="Sueldo de Carmen Gloria, pagos a mercaderistas y otros costos operativos."
      />

      <div style={S.statsRow} className="wc-stats">
        <StatCard label="Sueldo Carmen Gloria" value={CLP(totalSueldos)} />
        <StatCard label="Mercaderistas" value={CLP(totalMercaderistas)} />
        <StatCard label="Otros gastos" value={CLP(totalOtros)} />
        <StatCard label="Gasto total" value={CLP(totalGeneral)} accent="wine" />
      </div>

      <GastoSection
        title="Sueldo · Carmen Gloria"
        subtitle="Pagos de remuneración registrados por fecha."
        color="#8C2E4C"
        items={gastos.sueldos}
        onAdd={() => setOpenForm("sueldos")}
        onRemove={(id) => removeItem("sueldos", id)}
        renderItem={(x) => (
          <>
            <span style={S.tdStrong}>{x.periodo || "Sueldo"}</span>
            <span style={S.tdMono}>{fmtDate(x.fecha)}</span>
            <span style={{ ...S.tdMono, textAlign: "right", fontWeight: 600 }}>{CLP(x.monto)}</span>
          </>
        )}
      />
      {openForm === "sueldos" && (
        <GastoForm
          fields={[
            { key: "periodo", label: "Período / glosa", placeholder: "Ej: Sueldo agosto 2026" },
            { key: "fecha", label: "Fecha de pago", type: "date", required: true },
            { key: "monto", label: "Monto (CLP)", type: "number", required: true },
          ]}
          onCancel={() => setOpenForm(null)}
          onSave={(item) => addItem("sueldos", item)}
        />
      )}

      <GastoSection
        title="Mercaderistas"
        subtitle="Pagos a personal de reposición y merchandising en punto de venta."
        color="#B8935A"
        items={gastos.mercaderistas}
        onAdd={() => setOpenForm("mercaderistas")}
        onRemove={(id) => removeItem("mercaderistas", id)}
        renderItem={(x) => (
          <>
            <span style={S.tdStrong}>{x.nombre || "Mercaderista"}</span>
            <span style={S.tdMono}>{fmtDate(x.fecha)}</span>
            <span style={{ ...S.tdMono, textAlign: "right", fontWeight: 600 }}>{CLP(x.monto)}</span>
          </>
        )}
      />
      {openForm === "mercaderistas" && (
        <GastoForm
          fields={[
            { key: "nombre", label: "Nombre / local", placeholder: "Ej: Mercaderista Ekomas" },
            { key: "fecha", label: "Fecha de pago", type: "date", required: true },
            { key: "monto", label: "Monto (CLP)", type: "number", required: true },
          ]}
          onCancel={() => setOpenForm(null)}
          onSave={(item) => addItem("mercaderistas", item)}
        />
      )}

      <GastoSection
        title="Otros gastos"
        subtitle="Cualquier otro costo operativo del negocio."
        color="#7A8B6F"
        items={gastos.otros}
        onAdd={() => setOpenForm("otros")}
        onRemove={(id) => removeItem("otros", id)}
        renderItem={(x) => (
          <>
            <span style={S.tdStrong}>{x.concepto || "Gasto"}</span>
            <span style={S.tdMono}>{fmtDate(x.fecha)}</span>
            <span style={{ ...S.tdMono, textAlign: "right", fontWeight: 600 }}>{CLP(x.monto)}</span>
          </>
        )}
      />
      {openForm === "otros" && (
        <GastoForm
          fields={[
            { key: "concepto", label: "Concepto", placeholder: "Ej: Bencina, transporte, etc." },
            { key: "fecha", label: "Fecha", type: "date", required: true },
            { key: "monto", label: "Monto (CLP)", type: "number", required: true },
          ]}
          onCancel={() => setOpenForm(null)}
          onSave={(item) => addItem("otros", item)}
        />
      )}
    </div>
  );
}

function GastoSection({ title, subtitle, color, items, onAdd, onRemove, renderItem }) {
  return (
    <section style={S.gastoSection}>
      <div style={S.gastoSectionHead}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ ...S.dot, background: color }} />
          <div>
            <div style={S.gastoTitle}>{title}</div>
            <div style={S.gastoSub}>{subtitle}</div>
          </div>
        </div>
        <button style={S.ghostBtnSm} onClick={onAdd}><IconPlus size={14} /> Añadir</button>
      </div>
      <div style={S.gastoList}>
        {items.length === 0 && <div style={S.emptyRow}>Sin registros todavía.</div>}
        {items.map((x) => (
          <div key={x.id} style={S.gastoRow}>
            {renderItem(x)}
            <button style={{ ...S.iconLink, color: "#B5533C" }} onClick={() => onRemove(x.id)}><IconTrash size={14} /></button>
          </div>
        ))}
      </div>
    </section>
  );
}

function GastoForm({ fields, onCancel, onSave }) {
  const [f, setF] = useState(() => Object.fromEntries(fields.map((fl) => [fl.key, ""])));
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    for (const fl of fields) if (fl.required && !f[fl.key]) return;
    onSave({ ...f, monto: Number(f.monto) || 0 });
  };

  return (
    <form onSubmit={submit} style={{ ...S.formCard, marginTop: -8, marginBottom: 24 }}>
      <div style={S.formGrid} className="wc-form-grid">
        {fields.map((fl) => (
          <Field key={fl.key} label={fl.label} required={fl.required}>
            <input
              type={fl.type || "text"}
              style={S.input}
              value={f[fl.key]}
              onChange={set(fl.key)}
              placeholder={fl.placeholder}
              min={fl.type === "number" ? "0" : undefined}
            />
          </Field>
        ))}
      </div>
      <div style={S.formActions}>
        <button type="button" style={S.ghostBtn} onClick={onCancel}>Cancelar</button>
        <button type="submit" style={S.primaryBtn}>Guardar</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  PANEL: RESULTADOS                                                   */
/* ------------------------------------------------------------------ */
function ResultadosPanel({ pedidos, gastos }) {
  const totalVenta = pedidos.reduce((s, p) => s + Number(p.montoVenta || 0), 0);
  const totalComision = pedidos.reduce((s, p) => s + Number(p.montoComision || 0), 0);

  const facturaPagada = pedidos.filter((p) => p.estadoFactura === "Pagado").reduce((s, p) => s + Number(p.montoVenta || 0), 0);
  const facturaPendiente = totalVenta - facturaPagada;

  const comisionRecibida = pedidos.filter((p) => p.estadoComision === "Pagado").reduce((s, p) => s + Number(p.montoComision || 0), 0);
  const comisionPorRecibir = totalComision - comisionRecibida;

  const comisionPagadaTitin = pedidos.filter((p) => p.comisionTitinPagada === "Pagado").reduce((s, p) => s + Number(p.montoComision || 0), 0);
  const comisionPendienteTitin = totalComision - comisionPagadaTitin;

  const totalGastos =
    gastos.sueldos.reduce((s, x) => s + Number(x.monto || 0), 0) +
    gastos.mercaderistas.reduce((s, x) => s + Number(x.monto || 0), 0) +
    gastos.otros.reduce((s, x) => s + Number(x.monto || 0), 0);
  const utilidadNeta = totalComision - totalGastos;

  const porCliente = useMemo(() => {
    const map = {};
    pedidos.forEach((p) => {
      const c = p.cliente || "Sin especificar";
      if (!map[c]) map[c] = { cliente: c, venta: 0, comision: 0, pedidos: 0 };
      map[c].venta += Number(p.montoVenta || 0);
      map[c].comision += Number(p.montoComision || 0);
      map[c].pedidos += 1;
    });
    return Object.values(map).sort((a, b) => b.venta - a.venta);
  }, [pedidos]);

  const mejorCliente = porCliente[0];
  const maxVenta = mejorCliente ? mejorCliente.venta : 1;

  const evolutivo = useMemo(() => {
    const map = {};
    pedidos.forEach((p) => {
      const key = monthKey(p.fechaOrdenCompra);
      if (!key) return;
      if (!map[key]) map[key] = { mes: key, venta: 0, comision: 0 };
      map[key].venta += Number(p.montoVenta || 0);
      map[key].comision += Number(p.montoComision || 0);
    });
    return Object.values(map)
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map((x) => ({ ...x, label: monthLabel(x.mes) }));
  }, [pedidos]);

  return (
    <div>
      <PageHeader
        eyebrow="Panel de resultados"
        title="Resultados"
        desc="Cómo va el negocio: mejor cliente, resumen dinámico de ventas y comisiones, y su evolución mes a mes."
      />

      <div style={S.statsRow} className="wc-stats">
        <StatCard label="Venta total histórica" value={CLP(totalVenta)} />
        <StatCard label="Comisión total ganada" value={CLP(totalComision)} accent="wine" />
        <StatCard label="Comisión Titin pendiente" value={CLP(comisionPendienteTitin)} accent="rust" />
        <StatCard label="Utilidad neta (comisión − gastos)" value={CLP(utilidadNeta)} accent={utilidadNeta >= 0 ? "sage" : "rust"} />
      </div>

      {/* Mejor cliente */}
      <div style={S.card}>
        <div style={S.cardHeadRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={S.trophyBadge}><IconTrophy size={16} /></span>
            <div>
              <div style={S.cardTitle}>Mejor cliente</div>
              <div style={S.cardSub}>Ranking por volumen de venta acumulado</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          {porCliente.map((c, i) => (
            <div key={c.cliente} style={S.rankRow} className="wc-rank-row">
              <div style={S.rankLabelRow}>
                <span style={S.rankIndex}>{String(i + 1).padStart(2, "0")}</span>
                <span style={S.rankName}>{c.cliente}</span>
                <span style={S.rankMeta}>{c.pedidos} pedido{c.pedidos !== 1 ? "s" : ""} · comisión {CLP(c.comision)}</span>
              </div>
              <div style={S.barTrack}>
                <div style={{ ...S.barFill, width: `${Math.max(4, (c.venta / maxVenta) * 100)}%` }} />
              </div>
              <div style={S.rankValue} className="wc-rank-value">{CLP(c.venta)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen dinámico de estados de pago */}
      <div style={S.card}>
        <div style={S.cardTitle}>Resumen dinámico de pagos</div>
        <div style={S.cardSub}>Se recalcula al instante según el estado de cada venta</div>
        <div style={S.dynamicGrid} className="wc-dynamic-grid">
          <DynamicBlock
            label="Facturas"
            paidLabel="Pagadas"
            paid={facturaPagada}
            pending={facturaPendiente}
            total={totalVenta}
            count={pedidos.filter((p) => p.estadoFactura === "Pagado").length}
            countTotal={pedidos.length}
          />
          <DynamicBlock
            label="Comisiones"
            paidLabel="Recibidas"
            paid={comisionRecibida}
            pending={comisionPorRecibir}
            total={totalComision}
            count={pedidos.filter((p) => p.estadoComision === "Pagado").length}
            countTotal={pedidos.length}
          />
          <DynamicBlock
            label="Pago a Titin"
            paidLabel="Liquidado"
            paid={comisionPagadaTitin}
            pending={comisionPendienteTitin}
            total={totalComision}
            count={pedidos.filter((p) => p.comisionTitinPagada === "Pagado").length}
            countTotal={pedidos.length}
          />
        </div>
      </div>

      {/* Evolutivo de ventas */}
      <div style={S.card}>
        <div style={S.cardTitle}>Evolutivo de ventas</div>
        <div style={S.cardSub}>Monto de venta por mes, según fecha de orden de compra</div>
        <div style={{ width: "100%", height: 260, marginTop: 12 }}>
          <ResponsiveContainer>
            <AreaChart data={evolutivo} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ventaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8C2E4C" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#8C2E4C" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#EFE7DB" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A7F70" }} axisLine={{ stroke: "#EFE7DB" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8A7F70" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <Tooltip formatter={(v) => CLP(v)} contentStyle={S.tooltip} />
              <Area type="monotone" dataKey="venta" name="Venta" stroke="#8C2E4C" fill="url(#ventaGrad)" strokeWidth={2.4} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resumen y evolutivo de comisiones */}
      <div style={S.twoCol} className="wc-two-col">
        <div style={S.card}>
          <div style={S.cardTitle}>Resumen de comisiones</div>
          <div style={S.cardSub}>Comisión total y estado de pago a Titin</div>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <SummaryLine label="Comisión total generada" value={CLP(totalComision)} />
            <SummaryLine label="Pagada a Titin" value={CLP(comisionPagadaTitin)} tone="sage" />
            <SummaryLine label="Pendiente de pago" value={CLP(comisionPendienteTitin)} tone="rust" />
            <div style={S.progressTrack}>
              <div style={{ ...S.progressFill, width: `${pct(comisionPagadaTitin, totalComision)}%` }} />
            </div>
            <div style={S.progressCaption}>
              {pct(comisionPagadaTitin, totalComision)}% de la comisión histórica ya está liquidada con Titin
            </div>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>Evolutivo de comisiones</div>
          <div style={S.cardSub}>Comisión generada por mes</div>
          <div style={{ width: "100%", height: 220, marginTop: 12 }}>
            <ResponsiveContainer>
              <BarChart data={evolutivo} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#EFE7DB" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8A7F70" }} axisLine={{ stroke: "#EFE7DB" }} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 11, fill: "#8A7F70" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                <Tooltip formatter={(v) => CLP(v)} contentStyle={S.tooltip} />
                <Bar dataKey="comision" name="Comisión" fill="#B8935A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function DynamicBlock({ label, paidLabel, paid, pending, total, count, countTotal }) {
  return (
    <div style={S.dynamicBlock}>
      <div style={S.dynamicHead}>
        <span style={S.dynamicLabel}>{label}</span>
        <span style={S.dynamicCount}>{count}/{countTotal}</span>
      </div>
      <div style={S.progressTrack}>
        <div style={{ ...S.progressFill, width: `${pct(paid, total)}%` }} />
      </div>
      <div style={S.dynamicFoot}>
        <span>{paidLabel}: <strong>{CLP(paid)}</strong></span>
        <span style={{ color: "#B5533C" }}>Pendiente: <strong>{CLP(pending)}</strong></span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  COMPONENTES CHICOS REUTILIZABLES                                    */
/* ------------------------------------------------------------------ */
function PageHeader({ eyebrow, title, desc, action }) {
  return (
    <div style={S.pageHeader}>
      <div>
        <div style={S.eyebrow}>{eyebrow}</div>
        <h1 style={S.h1}>{title}</h1>
        <p style={S.pageDesc}>{desc}</p>
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, accent, mono }) {
  const color = accent === "wine" ? "#8C2E4C" : accent === "rust" ? "#B5533C" : accent === "sage" ? "#5F7A52" : "#2A2420";
  return (
    <div style={S.statCard}>
      <div style={S.statLabel}>{label}</div>
      <div style={{ ...S.statValue, color, fontFamily: mono ? "'IBM Plex Mono', monospace" : "'Fraunces', serif" }}>{value}</div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label style={S.filterLabel}>
      {label}
      <select style={S.filterSelect} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o === "todos" ? "Todos" : o}</option>)}
      </select>
    </label>
  );
}

function Field({ label, required, children }) {
  return (
    <label style={S.field}>
      <span style={S.fieldLabel}>{label}{required && <span style={{ color: "#B5533C" }}> *</span>}</span>
      {children}
    </label>
  );
}

function SummaryLine({ label, value, tone }) {
  const color = tone === "sage" ? "#5F7A52" : tone === "rust" ? "#B5533C" : "#2A2420";
  return (
    <div style={S.summaryLine}>
      <span style={S.summaryLabel}>{label}</span>
      <span style={{ ...S.summaryValue, color }}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ESTILOS                                                             */
/* ------------------------------------------------------------------ */
const PAPER = "#FDFBF8";
const INK = "#332B24";
const WINE = "#8C2E4C";
const WINE_DARK = "#7A2E45";
const GOLD = "#C7A06B";
const LINE = "#ECE4D6";
const MUTED = "#93887A";

const S = {
  app: { display: "flex", minHeight: "100vh", background: PAPER, color: INK, fontFamily: "'IBM Plex Sans', sans-serif" },

  sidebar: {
    width: 240, flexShrink: 0, background: WINE_DARK, color: "#F3E9DF",
    display: "flex", flexDirection: "column", padding: "26px 18px",
    position: "sticky", top: 0, height: "100vh",
  },
  brand: { display: "flex", alignItems: "center", gap: 10, padding: "0 6px 26px", borderBottom: "1px solid rgba(243,233,223,0.14)", marginBottom: 20 },
  brandMark: { width: 38, height: 38, borderRadius: 10, background: "rgba(184,147,90,0.22)", display: "flex", alignItems: "center", justifyContent: "center", color: GOLD, flexShrink: 0 },
  brandName: { fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600, letterSpacing: 0.2 },
  brandSub: { fontSize: 11, color: "rgba(243,233,223,0.55)", marginTop: 2 },

  nav: { display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  navItem: {
    display: "flex", alignItems: "center", gap: 11, padding: "10px 10px", borderRadius: 9,
    background: "transparent", border: "none", color: "rgba(243,233,223,0.72)", cursor: "pointer",
    textAlign: "left", width: "100%", transition: "background 0.15s ease",
  },
  navItemActive: { background: "rgba(243,233,223,0.1)", color: "#FBF8F3" },
  navIcon: { width: 30, height: 30, borderRadius: 8, background: "rgba(243,233,223,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  navIconActive: { background: GOLD, color: WINE_DARK },
  navLabel: { fontSize: 13.5, fontWeight: 600 },
  navSubLabel: { fontSize: 10.5, color: "rgba(243,233,223,0.45)", marginTop: 1 },

  sidebarFooter: { display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgba(243,233,223,0.5)", paddingTop: 16, borderTop: "1px solid rgba(243,233,223,0.14)" },
  mobileActions: { display: "none", gap: 8, marginTop: 10, flexWrap: "wrap" },
  mobileActionBtn: {
    background: "rgba(243,233,223,0.08)", border: "1px solid rgba(243,233,223,0.25)", color: "#F3E9DF",
    borderRadius: 7, padding: "7px 11px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
  },
  saveDot: (status) => ({
    width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
    background: status === "saving" ? GOLD : status === "error" || status === "unavailable" ? "#C24E3A" : "#7A9270",
  }),
  warnBanner: {
    background: "#FBEAE4", border: "1px solid #E9BFB0", color: "#8A3B26", borderRadius: 10,
    padding: "10px 14px", fontSize: 12.5, marginBottom: 20, lineHeight: 1.4,
  },

  main: { flex: 1, padding: "36px 44px 60px", maxWidth: 1180, margin: "0 auto", width: "100%" },

  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, marginBottom: 26, flexWrap: "wrap" },
  eyebrow: { fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, fontWeight: 600, marginBottom: 6 },
  h1: { fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 600, margin: 0, color: WINE_DARK },
  pageDesc: { fontSize: 13.5, color: MUTED, marginTop: 8, maxWidth: 580, lineHeight: 1.5 },

  primaryBtn: {
    display: "inline-flex", alignItems: "center", gap: 7, background: WINE, color: "#FBF8F3",
    border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13.5, fontWeight: 600,
    cursor: "pointer", boxShadow: "0 2px 8px rgba(110,30,51,0.25)",
  },
  ghostBtn: {
    background: "transparent", border: `1px solid ${LINE}`, color: INK, borderRadius: 8,
    padding: "10px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
  },
  ghostBtnSm: {
    display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${LINE}`,
    color: WINE, borderRadius: 7, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
  },

  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 },
  statCard: { background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: "16px 18px" },
  statLabel: { fontSize: 11.5, color: MUTED, marginBottom: 6, fontWeight: 500 },
  statValue: { fontSize: 21, fontWeight: 600 },

  filterBar: { display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" },
  filterLabel: { fontSize: 11.5, color: MUTED, fontWeight: 600, display: "flex", flexDirection: "column", gap: 5 },
  filterSelect: { border: `1px solid ${LINE}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, background: "#fff", color: INK, minWidth: 160 },

  formCard: { background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: 22, marginBottom: 22 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  formActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${LINE}` },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: "#5C5347" },
  input: { border: `1px solid ${LINE}`, borderRadius: 8, padding: "9px 11px", fontSize: 13.5, color: INK, background: "#FDFBF8", width: "100%" },

  tableWrap: { background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "12px 14px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: MUTED, borderBottom: `1px solid ${LINE}`, fontWeight: 700, background: "#FAF6EF" },
  trClickable: { borderBottom: `1px solid ${LINE}`, cursor: "pointer", transition: "background 0.12s ease" },
  tdStrong: { padding: "11px 14px", fontWeight: 600, color: INK },
  tdMono: { padding: "11px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: "#54493C" },
  emptyRow: { padding: "28px 14px", textAlign: "center", color: MUTED, fontSize: 13 },

  miniBadge: (paid) => ({
    display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 20,
    padding: "3px 9px", fontSize: 10.5, fontWeight: 700,
    background: paid ? "rgba(95,122,82,0.13)" : "rgba(181,83,60,0.11)",
    color: paid ? "#4C6142" : "#B5533C",
  }),
  miniDot: (paid) => ({ width: 5, height: 5, borderRadius: "50%", background: paid ? "#5F7A52" : "#B5533C" }),

  iconLink: { background: "none", border: "none", color: WINE, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "4px 8px", display: "inline-flex", alignItems: "center" },

  gastoSection: { background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: 20, marginBottom: 16 },
  gastoSectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  gastoTitle: { fontSize: 15, fontWeight: 700, fontFamily: "'Fraunces', serif" },
  gastoSub: { fontSize: 12, color: MUTED, marginTop: 2 },
  dot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  gastoList: { marginTop: 14, display: "flex", flexDirection: "column" },
  gastoRow: { display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", alignItems: "center", gap: 12, padding: "10px 4px", borderTop: `1px solid ${LINE}` },

  card: { background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: 22, marginBottom: 20 },
  cardHeadRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: 700, fontFamily: "'Fraunces', serif", color: WINE_DARK },
  cardSub: { fontSize: 12, color: MUTED, marginTop: 3 },
  trophyBadge: { width: 32, height: 32, borderRadius: 9, background: "rgba(184,147,90,0.16)", color: "#8A6A2E", display: "flex", alignItems: "center", justifyContent: "center" },

  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },

  rankRow: { display: "grid", gridTemplateColumns: "180px 1fr 130px", alignItems: "center", gap: 14, padding: "10px 0" },
  rankLabelRow: { display: "flex", flexDirection: "column", gap: 2 },
  rankIndex: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: GOLD, fontWeight: 700 },
  rankName: { fontWeight: 700, fontSize: 13.5 },
  rankMeta: { fontSize: 10.5, color: MUTED },
  barTrack: { height: 8, background: "#F1E9DB", borderRadius: 6, overflow: "hidden" },
  barFill: { height: "100%", background: `linear-gradient(90deg, ${WINE}, ${GOLD})`, borderRadius: 6 },
  rankValue: { textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600 },

  summaryLine: { display: "flex", justifyContent: "space-between", fontSize: 13.5 },
  summaryLabel: { color: "#5C5347" },
  summaryValue: { fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" },
  progressTrack: { height: 8, background: "#F1E9DB", borderRadius: 6, overflow: "hidden", marginTop: 4 },
  progressFill: { height: "100%", background: "#5F7A52", borderRadius: 6 },
  progressCaption: { fontSize: 11.5, color: MUTED },

  dynamicGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 18 },
  dynamicBlock: { border: `1px solid ${LINE}`, borderRadius: 10, padding: "14px 16px", background: "#FDFBF8" },
  dynamicHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  dynamicLabel: { fontSize: 13, fontWeight: 700, color: WINE_DARK },
  dynamicCount: { fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: MUTED },
  dynamicFoot: { display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 8, color: "#4C6142" },

  tooltip: { background: "#2A2420", border: "none", borderRadius: 8, fontSize: 12.5, color: "#fff", padding: "8px 12px" },

  drawerOverlay: {
    position: "fixed", inset: 0, background: "rgba(42,36,32,0.38)", display: "flex",
    justifyContent: "flex-end", zIndex: 50, backdropFilter: "blur(1px)",
  },
  drawer: {
    width: 420, maxWidth: "92vw", height: "100%", background: "#FEFCF9", boxShadow: "-8px 0 30px rgba(0,0,0,0.15)",
    padding: "26px 26px 30px", overflowY: "auto", display: "flex", flexDirection: "column",
  },
  drawerHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  drawerEyebrow: { fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: GOLD, fontWeight: 700 },
  drawerTitle: { fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: WINE_DARK, marginTop: 4 },
  drawerClose: { background: "#F1E9DB", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#5C5347", flexShrink: 0 },

  drawerAmounts: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#F7F1E6", borderRadius: 12, padding: "14px 16px", marginBottom: 22 },
  drawerAmountLabel: { fontSize: 10.5, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 },
  drawerAmountValue: { fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, marginTop: 4 },

  drawerSection: { marginBottom: 22 },
  drawerSectionTitle: { fontSize: 12.5, fontWeight: 700, color: WINE_DARK, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 },
  drawerSectionHint: { fontSize: 11.5, color: MUTED, marginTop: -6, marginBottom: 12, lineHeight: 1.4 },
  drawerLink: { display: "inline-block", marginTop: 6, fontSize: 12.5, color: WINE, fontWeight: 600, textDecoration: "none" },

  detailRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${LINE}` },
  detailIcon: { color: GOLD, flexShrink: 0, display: "flex" },
  detailLabel: { fontSize: 12.5, color: "#5C5347", flex: 1 },
  detailValue: { fontSize: 12.5, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: INK },

  statusRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${LINE}` },
  statusLabel: { fontSize: 13, fontWeight: 700, color: INK },
  statusHint: { fontSize: 11, color: MUTED, marginTop: 2, maxWidth: 210, lineHeight: 1.35 },
  statusSelect: (paid) => ({
    border: "none", borderRadius: 20, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
    background: paid ? "rgba(95,122,82,0.16)" : "rgba(181,83,60,0.13)",
    color: paid ? "#4C6142" : "#B5533C", flexShrink: 0,
  }),

  drawerActions: { display: "flex", gap: 10, marginTop: "auto", paddingTop: 16 },
};
