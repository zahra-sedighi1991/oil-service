import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Invoice, ServiceOrder, Shop } from '../database/entities';
import { InvoiceStatus, ServiceOrderStatus } from '../common/enums';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async get(shopId: string) {
    const shop = await this.dataSource.getRepository(Shop).findOneByOrFail({ id: shopId });
    const rows = await this.dataSource.getRepository(ServiceOrder).query(
      `SELECT
        COUNT(*) FILTER (
          WHERE ("serviceDate" AT TIME ZONE $3)::date =
            (CURRENT_TIMESTAMP AT TIME ZONE $3)::date
        ) AS "todayServices",
        COUNT(DISTINCT "customerId") FILTER (
          WHERE ("serviceDate" AT TIME ZONE $3) >=
            date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE $3)
        ) AS "monthlyUniqueCustomers",
        COUNT(*) FILTER (
          WHERE ("serviceDate" AT TIME ZONE $3) >=
            date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE $3)
        ) AS "monthlyServices"
      FROM service_orders
      WHERE "shopId" = $1 AND status = $2`,
      [shopId, ServiceOrderStatus.COMPLETED, shop.timezone],
    );
    const customerRows = await this.dataSource.getRepository(ServiceOrder).query(
      `WITH today_customers AS (
        SELECT DISTINCT "customerId" FROM service_orders
        WHERE "shopId" = $1 AND status = $2
          AND ("serviceDate" AT TIME ZONE $3)::date =
            (CURRENT_TIMESTAMP AT TIME ZONE $3)::date
      )
      SELECT
        COUNT(*) FILTER (
          WHERE (first_service AT TIME ZONE $3)::date =
            (CURRENT_TIMESTAMP AT TIME ZONE $3)::date
        ) AS "newCustomers",
        COUNT(*) FILTER (
          WHERE (first_service AT TIME ZONE $3)::date <
            (CURRENT_TIMESTAMP AT TIME ZONE $3)::date
        ) AS "returningCustomers"
      FROM today_customers tc
      CROSS JOIN LATERAL (
        SELECT MIN("serviceDate") AS first_service FROM service_orders
        WHERE "shopId" = $1 AND status = $2 AND "customerId" = tc."customerId"
      ) history`,
      [shopId, ServiceOrderStatus.COMPLETED, shop.timezone],
    );
    const invoiceRows = await this.dataSource.getRepository(Invoice).query(
      `SELECT COUNT(*) AS count FROM invoices
       WHERE "shopId" = $1 AND status = $2
         AND ("issuedAt" AT TIME ZONE $3) >=
           date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE $3)`,
      [shopId, InvoiceStatus.ISSUED, shop.timezone],
    );
    const value = rows[0];
    return {
      today: {
        services: Number(value.todayServices),
        newCustomers: Number(customerRows[0].newCustomers),
        returningCustomers: Number(customerRows[0].returningCustomers),
      },
      month: {
        services: Number(value.monthlyServices),
        uniqueCustomers: Number(value.monthlyUniqueCustomers),
        invoices: Number(invoiceRows[0].count),
      },
    };
  }
}
