import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";

interface Commerce {
  nombre: string;
  telefonoWhatsapp: string;
  mpAccessToken: string;
  logoUrl: string;
  colorPrimario: string;
  colorSecundario: string;
  colorAcento: string;
}

interface FaqItem {
  pregunta: string;
  respuesta: string;
}

const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

export function AdminSettings() {
  const [commerce, setCommerce] = useState<Commerce>({ nombre: "", telefonoWhatsapp: "", mpAccessToken: "", logoUrl: "", colorPrimario: "#4f46e5", colorSecundario: "#6366f1", colorAcento: "#818cf8" });
  const [horarios, setHorarios] = useState<Record<string, { inicio: string; fin: string }[]>>({});
  const [greeting, setGreeting] = useState("");
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Commerce & { configuracionHorarios: string; botConfig: string }>("/api/commerce")
      .then((data) => {
        setCommerce({ ...data, logoUrl: data.logoUrl || "", colorPrimario: data.colorPrimario || "#4f46e5", colorSecundario: data.colorSecundario || "#6366f1", colorAcento: data.colorAcento || "#818cf8" });
        if (data.configuracionHorarios) {
          try { setHorarios(JSON.parse(data.configuracionHorarios)); } catch {}
        }
        if (data.botConfig) {
          try {
            const cfg = JSON.parse(data.botConfig);
            if (cfg.saludo) setGreeting(cfg.saludo);
            if (Array.isArray(cfg.faq)) setFaq(cfg.faq);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api("/api/commerce", {
        method: "PUT",
        body: JSON.stringify({
          ...commerce,
          configuracionHorarios: horarios,
          botConfig: {
            saludo: greeting,
            faq: faq.filter((f) => f.pregunta.trim() && f.respuesta.trim()),
          },
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
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

  function addFaq() {
    setFaq([...faq, { pregunta: "", respuesta: "" }]);
  }

  function updateFaq(idx: number, field: "pregunta" | "respuesta", value: string) {
    setFaq((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function removeFaq(idx: number) {
    setFaq((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>

      {saved && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Cambios guardados
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
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

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Personalización visual</h2>
          <div>
            <label className="block text-sm font-medium">Logo (URL)</label>
            <input value={commerce.logoUrl} onChange={(e) => setCommerce({ ...commerce, logoUrl: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" placeholder="https://ejemplo.com/logo.png" />
            {commerce.logoUrl && (
              <img src={commerce.logoUrl} alt="logo" className="mt-2 h-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium">Color primario</label>
              <input type="color" value={commerce.colorPrimario} onChange={(e) => setCommerce({ ...commerce, colorPrimario: e.target.value })} className="mt-1 block w-full h-10 rounded-md border border-gray-300 cursor-pointer" />
            </div>
            <div>
              <label className="block text-sm font-medium">Color secundario</label>
              <input type="color" value={commerce.colorSecundario} onChange={(e) => setCommerce({ ...commerce, colorSecundario: e.target.value })} className="mt-1 block w-full h-10 rounded-md border border-gray-300 cursor-pointer" />
            </div>
            <div>
              <label className="block text-sm font-medium">Color de acento</label>
              <input type="color" value={commerce.colorAcento} onChange={(e) => setCommerce({ ...commerce, colorAcento: e.target.value })} className="mt-1 block w-full h-10 rounded-md border border-gray-300 cursor-pointer" />
            </div>
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

        <div className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="text-lg font-semibold">Bot - Mensaje de bienvenida</h2>
          <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" placeholder="¡Hola! ¿En qué puedo ayudarte?" />
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="text-lg font-semibold">Bot - Preguntas frecuentes</h2>
          <p className="text-sm text-gray-500">El bot responderá estos textos cuando el cliente escriba la palabra clave.</p>
          {faq.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start border-b pb-3">
              <div className="flex-1 space-y-2">
                <input value={item.pregunta} onChange={(e) => updateFaq(idx, "pregunta", e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Palabra clave (ej: direccion)" />
                <textarea value={item.respuesta} onChange={(e) => updateFaq(idx, "respuesta", e.target.value)} rows={2} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Respuesta" />
              </div>
              <button type="button" onClick={() => removeFaq(idx)} className="text-red-500 text-sm mt-1">✕</button>
            </div>
          ))}
          <button type="button" onClick={addFaq} className="text-indigo-600 text-sm">+ Agregar FAQ</button>
        </div>

        <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
