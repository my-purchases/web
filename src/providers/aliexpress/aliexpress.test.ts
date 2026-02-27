import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  parsePrice,
  parsePriceInfo,
  parseCsvToRows,
  mapCsvRowToPurchase,
  mapJsonItemToPurchase,
  mapXlsxRowToPurchase,
} from './mapper';
import { aliexpressProvider } from './AliexpressProvider';
import type { AliexpressShopperInventoryItem, AliexpressXlsxOrderRow } from './types';

const JSON_FIXTURE = resolve(__dirname, '__fixtures__', 'sample-orders.json');
const CSV_FIXTURE = resolve(__dirname, '__fixtures__', 'sample-orders.csv');

// ─── parsePrice ─────────────────────────────────────────────

describe('parsePrice', () => {
  it('parses USD price "US $120.95"', () => {
    expect(parsePrice('US $120.95')).toBe(120.95);
  });

  it('parses PLN price "129,46zł"', () => {
    expect(parsePrice('129,46zł')).toBe(129.46);
  });

  it('parses simple price "US $3.93"', () => {
    expect(parsePrice('US $3.93')).toBe(3.93);
  });

  it('parses price with thousands "US $1,382.11"', () => {
    expect(parsePrice('US $1,382.11')).toBe(1382.11);
  });

  it('returns 0 for empty string', () => {
    expect(parsePrice('')).toBe(0);
  });

  it('parses "US $0.70"', () => {
    expect(parsePrice('US $0.70')).toBe(0.7);
  });
});

// ─── parsePriceInfo ─────────────────────────────────────────

describe('parsePriceInfo', () => {
  it('parses "US $120.95|120|95"', () => {
    expect(parsePriceInfo('US $120.95|120|95')).toBe(120.95);
  });

  it('parses "129,46zł|129|46"', () => {
    expect(parsePriceInfo('129,46zł|129|46')).toBe(129.46);
  });

  it('parses "US $2.04|2|04"', () => {
    expect(parsePriceInfo('US $2.04|2|04')).toBe(2.04);
  });

  it('parses "US $663.09|663|09"', () => {
    expect(parsePriceInfo('US $663.09|663|09')).toBe(663.09);
  });

  it('returns 0 for empty string', () => {
    expect(parsePriceInfo('')).toBe(0);
  });
});

// ─── JSON mapping ───────────────────────────────────────────

describe('mapJsonItemToPurchase', () => {
  const items = JSON.parse(
    readFileSync(JSON_FIXTURE, 'utf-8'),
  ) as AliexpressShopperInventoryItem[];

  it('maps a USD item correctly', () => {
    const purchase = mapJsonItemToPurchase(items[0]);
    expect(purchase.id).toBe('aliexpress-3069099405669913-1005008226693966-12000044304276428');
    expect(purchase.providerId).toBe('aliexpress');
    expect(purchase.title).toBe('SucceBuy Ultrasonic Cleaner 6L');
    expect(purchase.price).toBe(120.95);
    expect(purchase.currency).toBe('USD');
    expect(purchase.imageUrl).toContain('alicdn.com');
    expect(purchase.originalUrl).toContain('aliexpress.com/item/1005008226693966');
  });

  it('maps a PLN item correctly', () => {
    const purchase = mapJsonItemToPurchase(items[1]);
    expect(purchase.price).toBe(129.46);
    expect(purchase.currency).toBe('PLN');
    expect(purchase.title).toBe('Your Taste Set-5x Salted Pistachios 500g');
  });

  it('multiplies price by quantity', () => {
    const purchase = mapJsonItemToPurchase(items[2]);
    expect(purchase.price).toBe(4.08); // 2.04 * 2
    expect(purchase.title).toBe('Filament Storage Dryer Box 3D Printer');
  });

  it('uses orderDateIso as purchaseDate', () => {
    const purchase = mapJsonItemToPurchase(items[0]);
    expect(purchase.purchaseDate).toContain('2026-02-20');
  });

  it('stores rawData with order metadata', () => {
    const purchase = mapJsonItemToPurchase(items[0]);
    expect(purchase.rawData).toBeDefined();
    expect((purchase.rawData as Record<string, unknown>)['orderId']).toBe('3069099405659913');
    expect((purchase.rawData as Record<string, unknown>)['storeName']).toBe(
      'SucceBuy Appliance Overseas Global Store',
    );
  });
});

// ─── CSV parsing ────────────────────────────────────────────

describe('parseCsvToRows', () => {
  const csv = readFileSync(CSV_FIXTURE, 'utf-8');

  it('parses CSV into rows', () => {
    const rows = parseCsvToRows(csv);
    expect(rows).toHaveLength(5);
  });

  it('parses headers correctly', () => {
    const rows = parseCsvToRows(csv);
    expect(rows[0]['Title']).toBe('SucceBuy Ultrasonic Cleaner 6L');
    expect(rows[0]['Order ID']).toBe('3069099405659913');
  });

  it('handles quoted fields with commas', () => {
    const rows = parseCsvToRows(csv);
    expect(rows[0]['Attributes']).toBe('Color: 6L, Ships From: GERMANY');
  });
});

describe('mapCsvRowToPurchase', () => {
  const csv = readFileSync(CSV_FIXTURE, 'utf-8');
  const rows = parseCsvToRows(csv);

  it('maps first CSV row to purchase', () => {
    const purchase = mapCsvRowToPurchase(rows[0]);
    expect(purchase).not.toBeNull();
    expect(purchase!.title).toBe('SucceBuy Ultrasonic Cleaner 6L');
    expect(purchase!.price).toBe(120.95);
    expect(purchase!.currency).toBe('USD');
    expect(purchase!.providerId).toBe('aliexpress');
  });

  it('handles PLN currency in CSV', () => {
    const purchase = mapCsvRowToPurchase(rows[1]);
    expect(purchase).not.toBeNull();
    expect(purchase!.price).toBe(129.46);
    expect(purchase!.currency).toBe('PLN');
  });

  it('multiplies price by quantity in CSV', () => {
    const purchase = mapCsvRowToPurchase(rows[2]);
    expect(purchase).not.toBeNull();
    expect(purchase!.price).toBe(4.08); // 2.04 * 2
  });

  it('returns null for row without title', () => {
    const emptyRow = { ...rows[0], Title: '' } as typeof rows[0];
    const purchase = mapCsvRowToPurchase(emptyRow);
    expect(purchase).toBeNull();
  });
});

// ─── XLSX mapping ───────────────────────────────────────────

describe('mapXlsxRowToPurchase', () => {
  const sampleRow: AliexpressXlsxOrderRow = {
    order_id: '3069099405669913',
    parent_orderid: '3069099405659913',
    gmt_create_order_time: '2026-02-21 07:44:46',
    order_status: 'FINISH',
    item_name: 'SucceBuy Ultrasonic Cleaner 6L',
    unit_price: 15115,
    payable_amt: 11974,
    gmt_pay_order_time: '2026-02-21 07:44:51',
    gmt_trade_end_time: '2026-02-27 18:17:56',
    end_reason: 'buyer_accept_goods',
    is_success_pay: 'true',
    frozen_status: '0',
  };

  it('maps XLSX row to purchase', () => {
    const purchase = mapXlsxRowToPurchase(sampleRow);
    expect(purchase).not.toBeNull();
    expect(purchase!.id).toBe('aliexpress-3069099405669913');
    expect(purchase!.providerId).toBe('aliexpress');
    expect(purchase!.title).toBe('SucceBuy Ultrasonic Cleaner 6L');
  });

  it('converts cents to dollars', () => {
    const purchase = mapXlsxRowToPurchase(sampleRow);
    expect(purchase!.price).toBe(119.74); // 11974 / 100
  });

  it('uses gmt_create_order_time as purchaseDate', () => {
    const purchase = mapXlsxRowToPurchase(sampleRow);
    expect(purchase!.purchaseDate).toContain('2026-02-21');
  });

  it('stores rawData with order metadata', () => {
    const purchase = mapXlsxRowToPurchase(sampleRow);
    expect(purchase!.rawData).toBeDefined();
    expect((purchase!.rawData as Record<string, unknown>)['orderStatus']).toBe('FINISH');
    expect((purchase!.rawData as Record<string, unknown>)['parentOrderId']).toBe('3069099405659913');
  });

  it('returns null for row without item_name', () => {
    const emptyRow = { ...sampleRow, item_name: '' };
    expect(mapXlsxRowToPurchase(emptyRow)).toBeNull();
  });

  it('returns null for row without order_id', () => {
    const emptyRow = { ...sampleRow, order_id: '' };
    expect(mapXlsxRowToPurchase(emptyRow)).toBeNull();
  });
});

// ─── Provider-level status filtering ────────────────────────

describe('aliexpressProvider.parseImportFile (status filtering)', () => {
  it('filters JSON to only include Completed items', async () => {
    const jsonContent = readFileSync(JSON_FIXTURE, 'utf-8');
    const allItems = JSON.parse(jsonContent) as AliexpressShopperInventoryItem[];
    expect(allItems).toHaveLength(5); // 3 Completed + 1 Awaiting shipment + 1 Cancelled

    const file = new File([jsonContent], 'orders.json', { type: 'application/json' });
    const purchases = await aliexpressProvider.parseImportFile(file);

    expect(purchases).toHaveLength(3);
    purchases.forEach((p) => {
      expect((p.rawData as Record<string, unknown>)['status']).toBe('Completed');
    });
  });

  it('excludes Awaiting shipment items from JSON', async () => {
    const jsonContent = readFileSync(JSON_FIXTURE, 'utf-8');
    const file = new File([jsonContent], 'orders.json', { type: 'application/json' });
    const purchases = await aliexpressProvider.parseImportFile(file);

    const titles = purchases.map((p) => p.title);
    expect(titles).not.toContain('Pending Order Item');
  });

  it('excludes Cancelled items from JSON', async () => {
    const jsonContent = readFileSync(JSON_FIXTURE, 'utf-8');
    const file = new File([jsonContent], 'orders.json', { type: 'application/json' });
    const purchases = await aliexpressProvider.parseImportFile(file);

    const titles = purchases.map((p) => p.title);
    expect(titles).not.toContain('Cancelled Order Item');
  });

  it('filters CSV to only include Completed items', async () => {
    const csvContent = readFileSync(CSV_FIXTURE, 'utf-8');
    const file = new File([csvContent], 'orders.csv', { type: 'text/csv' });
    const purchases = await aliexpressProvider.parseImportFile(file);

    expect(purchases).toHaveLength(3);
    purchases.forEach((p) => {
      expect((p.rawData as Record<string, unknown>)['status']).toBe('Completed');
    });
  });

  it('excludes Awaiting shipment items from CSV', async () => {
    const csvContent = readFileSync(CSV_FIXTURE, 'utf-8');
    const file = new File([csvContent], 'orders.csv', { type: 'text/csv' });
    const purchases = await aliexpressProvider.parseImportFile(file);

    const titles = purchases.map((p) => p.title);
    expect(titles).not.toContain('Pending Order Item');
  });

  it('excludes Cancelled items from CSV', async () => {
    const csvContent = readFileSync(CSV_FIXTURE, 'utf-8');
    const file = new File([csvContent], 'orders.csv', { type: 'text/csv' });
    const purchases = await aliexpressProvider.parseImportFile(file);

    const titles = purchases.map((p) => p.title);
    expect(titles).not.toContain('Cancelled Order Item');
  });

  it('returns empty array when no items are Completed (JSON)', async () => {
    const items = [
      {
        id: '1',
        orderId: '1',
        orderLineId: '1',
        productId: '1',
        skuId: '1',
        title: 'Pending',
        price: 'US $10.00',
        priceInfo: 'US $10.00|10|00',
        currency: 'USD',
        quantity: 1,
        orderDate: 'Feb 1, 2026',
        orderDateIso: '2026-02-01',
        status: 'Awaiting shipment',
        storeName: 'Store',
        storePageUrl: '',
        productUrl: '',
        imageUrl: '',
        attributes: '',
        timestamp: 0,
        ignoreExport: false,
        tags: [],
      },
    ];
    const file = new File([JSON.stringify(items)], 'orders.json', { type: 'application/json' });
    const purchases = await aliexpressProvider.parseImportFile(file);
    expect(purchases).toHaveLength(0);
  });
});
