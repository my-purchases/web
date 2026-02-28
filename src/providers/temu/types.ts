/**
 * Temu CSV column headers
 * (from Temu GDPR data export / order history export)
 *
 * Example row:
 *   "PO-162-21726517842553634","40 Szt. ...","2023/11/14","2023/11/15",
 *   "70,48 zł","0,00 zł","0,00 zł","70,48 zł",
 *   "https://www.temu.com/bgt_order_detail.html?parent_order_sn=PO-162-21726517842553634"
 */
export interface TemuCsvRow {
  'Order ID': string;
  'Item description at order time': string;
  'Order time': string;
  'Shipped date': string;
  'Price': string;
  'Price tax': string;
  'Shipping cost': string;
  'Order total': string;
  'Order detail URL': string;
}

/** Column headers we require to identify a valid Temu CSV */
export const TEMU_REQUIRED_COLUMNS = [
  'Order ID',
  'Item description at order time',
  'Order time',
  'Price',
] as const;
