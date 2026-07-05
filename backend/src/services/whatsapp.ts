const API_BASE = "https://graph.facebook.com/v21.0";

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  token: string,
  to: string,
  payload: Record<string, any>
) {
  const res = await fetch(`${API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, ...payload }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`WhatsApp API error (${res.status}):`, text);
  }

  return res;
}

export function buildGreetingButtons() {
  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: "¡Hola! ¿En qué puedo ayudarte?" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "reservar", title: "📅 Reservar Turno" } },
          { type: "reply", reply: { id: "cancelar", title: "❌ Cancelar" } },
        ],
      },
    },
  };
}
