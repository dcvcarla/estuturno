import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Service {
  id: number;
  nombre: string;
  duracionMinutos: number;
  precio: number;
  montoSena: number | null;
}

interface Commerce {
  nombre: string;
  telefonoWhatsapp: string;
  configuracionHorarios: unknown;
}

export function Landing() {
  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [step, setStep] = useState<"services" | "dates" | "slots" | "form" | "done">("services");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<Commerce>("/api/commerce/public").then(setCommerce).catch(() => {});
    api<Service[]>("/api/services/public").then(setServices).catch(() => {});
  }, []);

  async function selectService(s: Service) {
    setSelectedService(s);
    setError("");
    const dates = await api<string[]>(`/api/appointments/available-dates?service_id=${s.id}&days=30`).catch(() => []);
    setAvailableDates(dates);
    setStep("dates");
  }

  async function selectDate(d: string) {
    setDate(d);
    setError("");
    const slots = await api<string[]>(`/api/appointments/slots?date=${d}&service_id=${selectedService!.id}`).catch(() => []);
    setSlots(slots);
    setStep("slots");
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T12:00:00");
    const days = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  }

  async function handleSubmit() {
    setError("");
    try {
      await api<{ id: number }>("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          serviceId: selectedService!.id,
          fecha: date,
          hora: selectedSlot,
          nombreCliente: nombre,
          telefonoCliente: telefono,
        }),
      });
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al reservar");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-900">{commerce?.nombre || "EsTuTurno"}</h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
          )}

          {step === "services" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Seleccioná un servicio</h2>
              <div className="space-y-3">
                {services.map((s) => (
                  <button key={s.id} onClick={() => selectService(s)} className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition">
                    <p className="font-medium">{s.nombre}</p>
                    <p className="text-sm text-gray-500">{s.duracionMinutos} min</p>
                    <p className="text-sm font-semibold text-indigo-600">${Number(s.precio).toFixed(2)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "dates" && (
            <div>
              <h2 className="text-lg font-semibold mb-2">{selectedService?.nombre}</h2>
              <p className="text-sm text-gray-500 mb-4">Elegí un día disponible</p>
              {availableDates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay días disponibles en los próximos 30 días</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableDates.map((d) => (
                    <button key={d} onClick={() => selectDate(d)} className="p-3 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition text-center">
                      <p className="font-medium text-sm">{formatDate(d)}</p>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setStep("services")} className="mt-4 text-sm text-gray-500 hover:text-gray-700">
                ← Volver a servicios
              </button>
            </div>
          )}

          {step === "slots" && (
            <div>
              <h2 className="text-lg font-semibold mb-2">{selectedService?.nombre}</h2>
              <p className="text-sm text-gray-500 mb-4">{formatDate(date)} — Elegí un horario</p>
              {slots.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay horarios disponibles para esta fecha</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((slot) => (
                    <button key={slot} onClick={() => { setSelectedSlot(slot); setStep("form"); }} className="p-2 rounded-md border border-gray-200 hover:border-indigo-400 text-sm hover:bg-indigo-50 transition">
                      {slot}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setStep("dates")} className="mt-4 text-sm text-gray-500 hover:text-gray-700">
                ← Volver a días
              </button>
            </div>
          )}

          {step === "form" && (
            <div>
              <h2 className="text-lg font-semibold mb-2">{selectedService?.nombre}</h2>
              <p className="text-sm text-gray-500 mb-4">{formatDate(date)} a las {selectedSlot}</p>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" className="w-full rounded-md border border-gray-300 px-3 py-2 mb-3" required />
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Tu teléfono" className="w-full rounded-md border border-gray-300 px-3 py-2 mb-4" required />
              {selectedService?.montoSena && Number(selectedService.montoSena) > 0 && (
                <p className="text-sm text-indigo-600 mb-4">Se requiere seña de ${Number(selectedService.montoSena).toFixed(2)}</p>
              )}
              <button onClick={handleSubmit} className="w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 transition font-medium">
                Reservar turno
              </button>
              <button onClick={() => setStep("slots")} className="mt-3 text-sm text-gray-500 hover:text-gray-700 block text-center w-full">
                ← Volver a horarios
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-lg font-semibold mb-2">Turno reservado</h2>
              <p className="text-gray-500">Te esperamos el {formatDate(date)} a las {selectedSlot}</p>
              <button onClick={() => setStep("services")} className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 text-sm">
                Volver a la página principal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
