const API_BASE = "https://graph.facebook.com/v25.0";

function normalizeNumber(phone: string): string {
  if (phone.startsWith("549") && phone.length > 3 && phone[3] !== "9") {
    return "54" + phone.slice(3);
  }
  return phone;
}

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  token: string,
  to: string,
  payload: Record<string, any>
) {
  const normalizedTo = normalizeNumber(to);
  const body = JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: normalizedTo, ...payload });
  const res = await fetch(`${API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[WA ERROR] ${res.status}: ${text}`);
  }

  return { ok: res.ok, status: res.status, data: res.ok ? undefined : "see logs" };
}

export function buildGreetingButtons(bodyText?: string) {
  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText || "¡Hola! ¿En qué puedo ayudarte?" },
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
  const maxRows = 10;
  const rows = services.slice(0, maxRows).map((s) => ({
    id: `servicio_${s.id}`,
    title: s.nombre,
    description: `$${Number(s.precio).toLocaleString("es-AR")}`,
  }));

  if (services.length > maxRows) {
    rows.push({ id: "ver_mas", title: `Ver más (${services.length - maxRows} más)`, description: "" });
  }

  return {
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: "Nuestros Servicios" },
      body: { text: `Seleccioná un servicio (${services.length} disponibles):` },
      footer: { text: "Elegí de la lista" },
      action: {
        button: "Ver servicios",
        sections: [{ title: "Disponibles", rows }],
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
        buttons: dates.slice(0, 3).map((d) => {
          const date = new Date(d + "T12:00:00Z");
          const label = date.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
          return { type: "reply", reply: { id: `fecha_${d}`, title: label } };
        }),
      },
    },
  };
}

export function buildSlotButtons(slots: string[]) {
  if (slots.length <= 3) {
    return {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: "Elegí un horario:" },
        action: {
          buttons: slots.slice(0, 3).map((s) => ({
            type: "reply",
            reply: { id: `hora_${s}`, title: s },
          })),
        },
      },
    };
  }
  return {
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: "Horarios disponibles" },
      body: { text: "Elegí un horario:" },
      action: {
        button: "Ver horarios",
        sections: [
          {
            title: "Disponibles",
            rows: slots.slice(0, 10).map((s) => ({
              id: `hora_${s}`,
              title: s,
            })),
          },
        ],
      },
    },
  };
}

export function buildTextMessage(text: string) {
  return { type: "text", text: { body: text } };
}
