import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";

interface Service {
  id: number;
  nombre: string;
  duracionMinutos: number;
  precio: number;
  montoSena: number | null;
  activo: boolean;
}

export function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [nombre, setNombre] = useState("");
  const [duracionMinutos, setDuracionMinutos] = useState(30);
  const [precio, setPrecio] = useState(0);
  const [montoSena, setMontoSena] = useState("");

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
    setShowForm(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setNombre(s.nombre);
    setDuracionMinutos(s.duracionMinutos);
    setPrecio(Number(s.precio));
    setMontoSena(s.montoSena ? String(Number(s.montoSena)) : "");
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = {
      nombre,
      duracionMinutos,
      precio,
      montoSena: montoSena ? Number(montoSena) : null,
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

  const editModal = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{editing ? "Editar" : "Nuevo"} servicio</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Duración (minutos)</label>
            <input type="number" value={duracionMinutos} onChange={(e) => setDuracionMinutos(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" required min={5} />
          </div>
          <div>
            <label className="block text-sm font-medium">Precio ($)</label>
            <input type="number" value={precio} onChange={(e) => setPrecio(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" required min={0} step="0.01" />
          </div>
          <div>
            <label className="block text-sm font-medium">Seña ($, opcional)</label>
            <input type="number" value={montoSena} onChange={(e) => setMontoSena(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" min={0} step="0.01" />
          </div>
          <div className="flex gap-2 justify-end">
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {services.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
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
