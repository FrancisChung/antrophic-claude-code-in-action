export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
}

export async function sendSlackMessage(message: SlackMessage): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("SLACK_WEBHOOK_URL environment variable is not set");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Failed to send Slack message: ${response.statusText}`);
  }
}

export interface StalePendingOrder {
  order_id: number;
  order_date: string;
  total_amount: number;
  customer_name: string;
  email: string;
  phone: string;
  days_pending: number;
}

export async function sendPendingOrderAlert(
  orders: StalePendingOrder[]
): Promise<void> {
  if (orders.length === 0) {
    return;
  }

  const orderLines = orders
    .map(
      (order) =>
        `• Order #${order.order_id} - ${order.customer_name} (${order.phone || "No phone"}) - ${Math.floor(order.days_pending)} days pending`
    )
    .join("\n");

  const message: SlackMessage = {
    channel: "#order-alerts",
    text: `⚠️ ${orders.length} order(s) pending longer than 3 days:\n${orderLines}`,
  };

  await sendSlackMessage(message);
}
