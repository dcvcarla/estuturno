import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";

interface Commerce {
  nombre: string;
  telefonoWhatsapp: string;
  mpAccessToken: string;
}

const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

export function AdminSettings() {
  const [commerce, setCommerce] = useState<Commerce>({ nombre: "", telefonoWhatsapp: "", mpAccessToken: "" });
  const [horarios, setHorarios] = useState<Record<string, { inicio: string; fin: string }[]>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<Commerce & { configuracionHorarios: string }>("/api/commerce")
      .then((data) => {
        setCommerce(data);
        if (data.configuracionHorarios) {
          try { setHorarios(JSON.parse(data.configuracionHorarios)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    await api("/api/commerce", {
      method: "PUT",
      body: JSON.stringify({ ...commerce, configuracionHorarios: horarios }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function toggleDay(day: string) {
    setHorarios((prev) => {
      if (prev[day]) {
        const next = { ...prev };
        delete next[day];
        return next;
      }
      return { ...prev, [day]: [{ inicio: "09:00", fin: "18:00" }] };
    });
  }

  function updateSlot(day: string, idx: number, field: "inicio" | "fin", value: string) {
    setHorarios((prev) => {
      const slots = [...(prev[day] || [])];
      slots[idx] = { ...slots[idx], [field]: value };
      return { ...prev, [day]: slots };
    });
  }

  function addSlot(day: string) {
    setHorarios((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { inicio: "09:00", fin: "18:00" }],
    }));
  }

  function removeSlot(day: string, idx: number) {
    setHorarios((prev) => {
      const slots = (prev[day] || []).filter((_, i) => i !== idx);
      if (slots.length === 0) {
        const next = { ...prev };
        delete next[day];
        return next;
      }
      return { ...prev, [day]: slots };
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>

      {saved && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Cambios guardados
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 max-w-xl">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Datos del comercio</h2>
          <div>
            <label className="block text-sm font-medium">Nombre</label>
            <input value={commerce.nombre} onChange={(e) => setCommerce({ ...commerce, nombre: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">WhatsApp</label>
            <input value={commerce.telefonoWhatsapp} onChange={(e) => setCommerce({ ...commerce, telefonoWhatsapp: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" placeholder="+5491123456789" />
          </div>
          <div>
            <label className="block text-sm font-medium">Mercado Pago Access Token</label>
            <input value={commerce.mpAccessToken} onChange={(e) => setCommerce({ ...commerce, mpAccessToken: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" type="password" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Horarios de atención</h2>
          {DAYS.map((day) => {
            const isActive = !!horarios[day];
            return (
              <div key={day} className="mb-3 pb-3 border-b border-gray-100 last:border-0">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={() => toggleDay(day)} className="rounded" />
                  <span className="capitalize font-medium">{day}</span>
                </label>
                {isActive && horarios[day]?.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-2 mt-2 ml-6">
                    <input type="time" value={slot.inicio} onChange={(e) => updateSlot(day, idx, "inicio", e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
                    <span>a</span>
                    <input type="time" value={slot.fin} onChange={(e) => updateSlot(day, idx, "fin", e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
                    <button type="button" onClick={() => removeSlot(day, idx)} className="text-red-500 text-sm">✕</button>
                  </div>
                ))}
                {isActive && (
                  <button type="button" onClick={() => addSlot(day)} className="text-indigo-600 text-sm mt-1 ml-6">
                    + Agregar horario
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700">
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
