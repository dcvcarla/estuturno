import { MercadoPagoConfig, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || "",
});

export async function createPaymentPreference(
  items: { title: string; unit_price: number; quantity: number }[],
  externalReference: string,
  notificationUrl: string
) {
  const preference = new Preference(client);

  const result = await preference.create({
    body: {
      items: items.map((item) => ({
        title: item.title,
        unit_price: item.unit_price,
        quantity: item.quantity,
        currency_id: "ARS",
      })),
      external_reference: externalReference,
      notification_url: notificationUrl,
      purpose: "wallet_purchase",
    },
  });

  return {
    id: result.id,
    initPoint: result.init_point,
    sandboxInitPoint: result.sandbox_init_point,
  };
}
