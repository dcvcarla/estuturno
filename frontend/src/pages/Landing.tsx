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
  const [step, setStep] = useState<"services" | "slots" | "form" | "done">("services");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [, setAppointmentId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = { headers: { "x-forwarded-host": window.location.host } };
    api<Commerce>("/api/commerce/public", params).then(setCommerce).catch(() => {});
    api<Service[]>("/api/services/public", params).then(setServices).catch(() => {});
  }, []);

  async function selectService(s: Service) {
    setSelectedService(s);
    setStep("slots");
    loadSlots(s.id, date);
  }

  async function loadSlots(serviceId: number, d: string) {
    const slots = await api<string[]>(`/api/appointments/slots?date=${d}&service_id=${serviceId}`);
    setSlots(slots);
  }

  function handleDateChange(d: string) {
    setDate(d);
    if (selectedService) loadSlots(selectedService.id, d);
  }

  async function handleSubmit() {
    setError("");
    try {
      const apt = await api<{ id: number }>("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          serviceId: selectedService!.id,
          fecha: date,
          hora: selectedSlot,
          nombreCliente: nombre,
          telefonoCliente: telefono,
        }),
      });
      setAppointmentId(apt.id);

      if (selectedService?.montoSena && Number(selectedService.montoSena) > 0) {
        const pref = await api<{ initPoint: string }>("/api/payments/create-preference", {
          method: "POST",
          body: JSON.stringify({ appointmentId: apt.id }),
        });
        window.location.href = pref.initPoint;
      } else {
        setStep("done");
      }
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

          {step === "slots" && (
            <div>
              <h2 className="text-lg font-semibold mb-2">{selectedService?.nombre}</h2>
              <p className="text-sm text-gray-500 mb-4">Elegí una fecha y horario disponible</p>
              <input type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} min={new Date().toISOString().split("T")[0]} className="w-full rounded-md border border-gray-300 px-3 py-2 mb-4" />
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
              <button onClick={() => setStep("services")} className="mt-4 text-sm text-gray-500 hover:text-gray-700">
                ← Volver a servicios
              </button>
            </div>
          )}

          {step === "form" && (
            <div>
              <h2 className="text-lg font-semibold mb-2">{selectedService?.nombre}</h2>
              <p className="text-sm text-gray-500 mb-4">{date} a las {selectedSlot}</p>
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
              <p className="text-gray-500">Te esperamos el {date} a las {selectedSlot}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
