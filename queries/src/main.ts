import { open } from "sqlite";
import sqlite3 from "sqlite3";

import { createSchema } from "./schema";
import { getOrdersPendingLongerThan } from "./queries/order_queries";
import { sendPendingOrderAlert } from "./slack";

async function main() {
  const db = await open({
    filename: "ecommerce.db",
    driver: sqlite3.Database,
  });

  await createSchema(db, false);

  const stalePendingOrders = await getOrdersPendingLongerThan(db, 3);

  if (stalePendingOrders.length > 0) {
    console.log(`Found ${stalePendingOrders.length} orders pending longer than 3 days`);
    await sendPendingOrderAlert(stalePendingOrders);
    console.log("Alert sent to #order-alerts");
  } else {
    console.log("No stale pending orders found");
  }
}

main();
