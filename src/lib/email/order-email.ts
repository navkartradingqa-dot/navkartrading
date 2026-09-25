import "server-only";

import { resend, EMAIL_FROM, ADMIN_ORDER_EMAIL } from "./resend";

type OrderEmailData = {
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  total: string;
  currency: string;
  status: string;
  note?: string | null;
  trackingUrl?: string | null; // Optional link for tracking button
};

const statusMessages: Record<
  string,
  {
    subject: string;
    title: string;
    message: string;
    badgeColor: string;
  }
> = {
  PENDING: {
    subject: "Order Received",
    title: "We've received your order!",
    message:
      "Thank you for shopping with us. We are reviewing your order and will begin processing it shortly.",
    badgeColor: "#f59e0b", // Amber
  },
  CONFIRMED: {
    subject: "Order Confirmed",
    title: "Your order is confirmed!",
    message:
      "Good news! Your order has been confirmed and is being prepared by our team.",
    badgeColor: "#3b82f6", // Blue
  },
  PACKED: {
    subject: "Order Packed",
    title: "Your order has been packed",
    message:
      "Your items have been carefully packed and are getting ready to be handed over to delivery.",
    badgeColor: "#8b5cf6", // Purple
  },
  OUT_FOR_DELIVERY: {
    subject: "Order Out for Delivery",
    title: "Your order is on the way!",
    message:
      "Your package is out for delivery today. Please keep your phone available for the delivery driver.",
    badgeColor: "#06b6d4", // Cyan
  },
  DELIVERED: {
    subject: "Order Delivered",
    title: "Your order has been delivered",
    message:
      "Your package has been successfully delivered. We hope you love your purchase!",
    badgeColor: "#10b981", // Green
  },
  COMPLETED: {
    subject: "Order Completed",
    title: "Order completed",
    message:
      "This order has been successfully completed. Thank you for choosing Navkar Trading.",
    badgeColor: "#059669", // Emerald
  },
  CANCELLED: {
    subject: "Order Cancelled",
    title: "Your order has been cancelled",
    message:
      "This order has been cancelled. If you have any questions or need assistance, please contact support.",
    badgeColor: "#ef4444", // Red
  },
};

function customerHtml(order: OrderEmailData) {
  const content = statusMessages[order.status] || {
    title: "Order Update",
    message: "There has been an update to your order.",
    badgeColor: "#64748b",
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color:#0f172a;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:0.5px;">Navkar Trading & Services</h1>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding:40px;">
              
              <!-- Status Badge -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="background-color:${content.badgeColor};color:#ffffff;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                    ${escapeHtml(order.status)}
                  </td>
                </tr>
              </table>

              <h2 style="color:#0f172a;margin:0 0 12px 0;font-size:20px;font-weight:600;">
                ${content.title}
              </h2>
              
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
                Hello <strong>${escapeHtml(order.customerName)}</strong>,<br/>
                ${content.message}
              </p>

              <!-- Order Summary Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#64748b;font-size:13px;padding-bottom:8px;">Order Number</td>
                        <td align="right" style="color:#0f172a;font-size:13px;font-weight:600;padding-bottom:8px;">${escapeHtml(order.orderNumber)}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;font-size:13px;padding-bottom:8px;">Total Amount</td>
                        <td align="right" style="color:#0f172a;font-size:13px;font-weight:600;padding-bottom:8px;">${escapeHtml(order.currency)} ${escapeHtml(order.total)}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;font-size:13px;">Phone</td>
                        <td align="right" style="color:#0f172a;font-size:13px;font-weight:600;">${escapeHtml(order.customerPhone)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${
                order.note
                  ? `
                <div style="background-color:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
                  <strong style="color:#b45309;font-size:13px;display:block;margin-bottom:4px;">Order Note:</strong>
                  <span style="color:#92400e;font-size:14px;">${escapeHtml(order.note)}</span>
                </div>
                `
                  : ""
              }

              ${
                order.trackingUrl
                  ? `
                <!-- CTA Button -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
                  <tr>
                    <td align="center">
                      <a href="${order.trackingUrl}" target="_blank" style="background-color:#2563eb;color:#ffffff;padding:14px 28px;border-radius:6px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;box-shadow:0 2px 4px rgba(37,99,235,0.2);">
                        Track Your Order
                      </a>
                    </td>
                  </tr>
                </table>
                `
                  : ""
              }

              <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:30px 0 0 0;border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;">
                Need help? Reply directly to this email or contact support.<br/>
                &copy; Navkar Trading. All rights reserved.
              </p>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function adminHtml(order: OrderEmailData) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;padding:30px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
          <tr>
            <td>
              <h2 style="color:#0f172a;margin-top:0;font-size:18px;border-bottom:2px solid #e2e8f0;padding-bottom:12px;">
                🔔 New Order Update: ${escapeHtml(order.orderNumber)}
              </h2>

              <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;color:#334155;margin-top:15px;">
                <tr>
                  <td><strong>Status:</strong></td>
                  <td><span style="background:#e2e8f0;padding:2px 8px;border-radius:4px;font-weight:bold;">${escapeHtml(order.status)}</span></td>
                </tr>
                <tr>
                  <td><strong>Customer Name:</strong></td>
                  <td>${escapeHtml(order.customerName)}</td>
                </tr>
                <tr>
                  <td><strong>Email:</strong></td>
                  <td>${escapeHtml(order.customerEmail ?? "N/A")}</td>
                </tr>
                <tr>
                  <td><strong>Phone:</strong></td>
                  <td>${escapeHtml(order.customerPhone)}</td>
                </tr>
                <tr>
                  <td><strong>Total:</strong></td>
                  <td><strong>${escapeHtml(order.currency)} ${escapeHtml(order.total)}</strong></td>
                </tr>
              </table>

              ${
                order.note
                  ? `
                <div style="background:#f8fafc;border:1px solid #cbd5e1;padding:12px;border-radius:6px;margin-top:15px;">
                  <strong>Note:</strong> ${escapeHtml(order.note)}
                </div>
                `
                  : ""
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendOrderStatusEmail(order: OrderEmailData) {
  const content = statusMessages[order.status];

  if (!content) {
    console.warn(`No email template for status: ${order.status}`);
    return;
  }

  const tasks: Promise<unknown>[] = [];

  // Customer email
  if (order.customerEmail) {
    tasks.push(
      resend.emails.send({
        from: EMAIL_FROM,
        to: order.customerEmail,
        subject: `${content.subject} — ${order.orderNumber}`,
        html: customerHtml(order),
      }),
    );
  }

  // Admin email
  if (ADMIN_ORDER_EMAIL) {
    tasks.push(
      resend.emails.send({
        from: EMAIL_FROM,
        // to: ADMIN_ORDER_EMAIL,
        to: ADMIN_ORDER_EMAIL.split(",").map((email) => email.trim()),
        subject: `[Order ${order.status}] ${order.orderNumber}`,
        html: adminHtml(order),
      }),
    );
  }

  await Promise.all(tasks);
}
