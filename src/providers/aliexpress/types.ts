/**
 * AliExpress Shopper Inventory JSON format
 * (exported by the "Aliexpress Shopper Inventory" Chrome extension)
 */
export interface AliexpressShopperInventoryItem {
  id: string; // "{orderLineId}-{productId}-{skuId}"
  orderId: string;
  orderLineId: string;
  productId: string;
  skuId: string;
  title: string;
  price: string; // e.g. "US $120.95" or "129,46zł"
  priceInfo: string; // e.g. "US $120.95|120|95" or "129,46zł|129|46"
  currency: string; // "USD" | "PLN" | etc.
  quantity: number;
  orderDate: string; // e.g. "Feb 21, 2026"
  orderDateIso: string; // e.g. "2026-02-20"
  status: string; // "Completed" | "Expired" | etc.
  storeName: string;
  storePageUrl: string;
  productUrl: string;
  imageUrl: string;
  attributes: string; // e.g. "Color: 6L, Ships From: GERMANY"
  timestamp: number;
  ignoreExport: boolean;
  tags: string[];
}

/**
 * AliExpress CSV column headers
 * (exported by the "Aliexpress Shopper Inventory" Chrome extension)
 */
export interface AliexpressCsvRow {
  'Order Date': string;
  'Order ID': string;
  Title: string;
  Qty: string;
  Price: string;
  Store: string;
  'Product ID': string;
  'SKU ID': string;
  Attributes: string;
  'Price Info': string;
  Currency: string;
  Status: string;
  'Product Url': string;
  'Product Image Url': string;
  'Store Url': string;
  Tags: string;
}

/**
 * AliExpress GDPR/data backup XLSX "Order Information" row
 */
export interface AliexpressXlsxOrderRow {
  order_id: string;
  parent_orderid: string;
  gmt_create_order_time: string;
  order_status: string;
  item_name: string;
  unit_price: number; // In cents
  payable_amt: number; // In cents (actual amount paid)
  gmt_pay_order_time: string;
  gmt_trade_end_time: string;
  end_reason: string;
  is_success_pay: string;
  frozen_status: string;
}
