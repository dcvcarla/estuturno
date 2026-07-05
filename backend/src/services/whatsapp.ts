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

export function buildServiceList(services: { id: number; nombre: string; precio: number }[]) {
  return {
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: "Nuestros Servicios" },
      body: { text: "Seleccioná un servicio:" },
      footer: { text: "Elegí de la lista" },
      action: {
        button: "Ver servicios",
        sections: [
          {
            title: "Disponibles",
            rows: services.map((s) => ({
              id: `servicio_${s.id}`,
              title: s.nombre,
              description: `$${Number(s.precio).toLocaleString("es-AR")}`,
            })),
          },
        ],
      },
    },
  };
}

export function buildDateButtons(dates: string[]) {
  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: "Elegí un día disponible:" },
      action: {
        buttons: dates.map((d) => {
          const date = new Date(d + "T12:00:00Z");
          const label = date.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
          return { type: "reply", reply: { id: `fecha_${d}`, title: label } };
        }),
      },
    },
  };
}

export function buildSlotButtons(slots: string[]) {
  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: "Elegí un horario:" },
      action: {
        buttons: slots.slice(0, 10).map((s) => ({
          type: "reply",
          reply: { id: `hora_${s}`, title: s },
        })),
      },
    },
  };
}

export function buildTextMessage(text: string) {
  return { type: "text", text: { body: text } };
}
