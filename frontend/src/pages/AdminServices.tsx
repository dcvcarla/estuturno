import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";

interface Service {
  id: number;
  nombre: string;
  duracionMinutos: number;
  precio: number;
  montoSena: number | null;
  configuracionHorarios: Record<string, { inicio: string; fin: string }[]> | null;
  activo: boolean;
}

const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

export function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [nombre, setNombre] = useState("");
  const [duracionMinutos, setDuracionMinutos] = useState(30);
  const [precio, setPrecio] = useState(0);
  const [montoSena, setMontoSena] = useState("");
  const [useCustomHours, setUseCustomHours] = useState(false);
  const [horarios, setHorarios] = useState<Record<string, { inicio: string; fin: string }[]>>({});
  const [newDate, setNewDate] = useState("");
  const [newDateInicio, setNewDateInicio] = useState("09:00");
  const [newDateFin, setNewDateFin] = useState("18:00");

  function loadServices() {
    api<Service[]>("/api/services").then(setServices).catch(() => {});
  }

  useEffect(() => { loadServices() }, []);

  function openCreate() {
    setEditing(null);
    setNombre("");
    setDuracionMinutos(30);
    setPrecio(0);
    setMontoSena("");
    setUseCustomHours(false);
    setHorarios({});
    setShowForm(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setNombre(s.nombre);
    setDuracionMinutos(s.duracionMinutos);
    setPrecio(Number(s.precio));
    setMontoSena(s.montoSena ? String(Number(s.montoSena)) : "");
    const hasHours = s.configuracionHorarios && Object.keys(s.configuracionHorarios).length > 0;
    setUseCustomHours(!!hasHours);
    setHorarios(hasHours ? s.configuracionHorarios! : {});
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {
      nombre,
      duracionMinutos,
      precio,
      montoSena: montoSena ? Number(montoSena) : null,
      configuracionHorarios: useCustomHours ? horarios : null,
    };

    try {
      if (editing) {
        await api(`/api/services/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/api/services", { method: "POST", body: JSON.stringify(body) });
      }
      setShowForm(false);
      loadServices();
    } catch {}
  }

  async function handleDelete(id: number) {
    try {
      await api(`/api/services/${id}`, { method: "DELETE" });
      loadServices();
    } catch {}
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

  const isDateKey = (k: string) => /^\d{4}-\d{2}-\d{2}$/.test(k);

  function addSpecificDate() {
    if (!newDate) return;
    setHorarios((prev) => {
      const existing = prev[newDate] || [];
      const already = existing.some((s) => s.inicio === newDateInicio && s.fin === newDateFin);
      if (already) return prev;
      return { ...prev, [newDate]: [...existing, { inicio: newDateInicio, fin: newDateFin }] };
    });
  }

  function removeSpecificDate(date: string, idx: number) {
    setHorarios((prev) => {
      const slots = (prev[date] || []).filter((_, i) => i !== idx);
      if (slots.length === 0) {
        const next = { ...prev };
        delete next[date];
        return next;
      }
      return { ...prev, [date]: slots };
    });
  }

  const specificDates = Object.keys(horarios).filter(isDateKey);

  const hoursPicker = (
    <div className="space-y-3">
      <p className="text-sm font-medium">Días de la semana</p>
      <div className="space-y-2">
        {DAYS.map((day) => {
          const isActive = !!horarios[day];
          return (
            <div key={day} className="pb-2 border-b border-gray-100 last:border-0">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={() => toggleDay(day)} className="rounded" />
                <span className="capitalize text-sm font-medium">{day}</span>
              </label>
              {isActive && horarios[day]?.map((slot, idx) => (
                <div key={idx} className="flex items-center gap-2 mt-1 ml-6">
                  <input type="time" value={slot.inicio} onChange={(e) => updateSlot(day, idx, "inicio", e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm w-28" />
                  <span className="text-sm">a</span>
                  <input type="time" value={slot.fin} onChange={(e) => updateSlot(day, idx, "fin", e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm w-28" />
                  <button type="button" onClick={() => removeSlot(day, idx)} className="text-red-500 text-sm">✕</button>
                </div>
              ))}
              {isActive && (
                <button type="button" onClick={() => addSlot(day)} className="text-indigo-600 text-xs mt-1 ml-6">
                  + Agregar horario
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t pt-3">
        <p className="text-sm font-medium mb-2">Fechas específicas</p>
        {specificDates.map((date) => (
          <div key={date} className="mb-2">
            <p className="text-xs font-semibold text-gray-600 mb-1">{date}</p>
            {horarios[date]?.map((slot, idx) => (
              <div key={idx} className="flex items-center gap-2 ml-2 mb-1">
                <span className="text-sm">{slot.inicio} a {slot.fin}</span>
                <button type="button" onClick={() => removeSpecificDate(date, idx)} className="text-red-500 text-xs">✕</button>
              </div>
            ))}
          </div>
        ))}
        {specificDates.length === 0 && (
          <p className="text-xs text-gray-400 mb-2">No hay fechas agregadas</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm w-36" />
          <input type="time" value={newDateInicio} onChange={(e) => setNewDateInicio(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm w-24" />
          <span className="text-xs">a</span>
          <input type="time" value={newDateFin} onChange={(e) => setNewDateFin(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm w-24" />
          <button type="button" onClick={addSpecificDate} className="bg-indigo-600 text-white px-2 py-1 rounded text-xs hover:bg-indigo-700">Agregar</button>
        </div>
      </div>
    </div>
  );

  const editModal = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
      <div className="bg-white rounded-lg p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{editing ? "Editar" : "Nuevo"} servicio</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium">Duración (min)</label>
              <input type="number" value={duracionMinutos} onChange={(e) => setDuracionMinutos(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" required min={5} />
            </div>
            <div>
              <label className="block text-sm font-medium">Precio ($)</label>
              <input type="number" value={precio} onChange={(e) => setPrecio(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" required min={0} step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium">Seña ($)</label>
              <input type="number" value={montoSena} onChange={(e) => setMontoSena(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" min={0} step="0.01" />
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={useCustomHours} onChange={(e) => { setUseCustomHours(e.target.checked); if (!e.target.checked) setHorarios({}); }} className="rounded" />
              <span className="font-medium text-sm">Horarios personalizados</span>
            </label>
            {useCustomHours && hoursPicker}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-md border">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
              {editing ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Servicios</h1>
        <button onClick={openCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700">
          + Nuevo servicio
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seña</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horarios</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {services.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No hay servicios creados
                </td>
              </tr>
            )}
            {services.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-sm font-medium">{s.nombre}</td>
                <td className="px-4 py-3 text-sm">{s.duracionMinutos} min</td>
                <td className="px-4 py-3 text-sm">${Number(s.precio).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm">{s.montoSena ? `$${Number(s.montoSena).toFixed(2)}` : "-"}</td>
                <td className="px-4 py-3 text-sm">
                  {s.configuracionHorarios && Object.keys(s.configuracionHorarios).length > 0
                    ? "Personalizado"
                    : "General"}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${s.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {s.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 space-x-2">
                  <button onClick={() => openEdit(s)} className="text-sm text-indigo-600 hover:text-indigo-800">Editar</button>
                  {s.activo && (
                    <button onClick={() => handleDelete(s.id)} className="text-sm text-red-600 hover:text-red-800">Desactivar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && editModal}
    </div>
  );
}
