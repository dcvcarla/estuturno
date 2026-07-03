import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Appointment {
  id: number;
  nombreCliente: string;
  telefonoCliente: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  estado: string;
  service: { nombre: string; duracionMinutos: number };
}

export function AdminAgenda() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [estado, setEstado] = useState("");

  function loadAppointments() {
    const params = new URLSearchParams({ date });
    if (estado) params.append("estado", estado);
    api<Appointment[]>(`/api/appointments?${params}`).then(setAppointments);
  }

  useEffect(() => { loadAppointments() }, [date, estado]);

  async function cancelAppointment(id: number) {
    await api(`/api/appointments/${id}/cancel`, { method: "PUT" });
    loadAppointments();
  }

  const statusBadge = (estado: string) => {
    const styles: Record<string, string> = {
      pendiente_pago: "bg-yellow-100 text-yellow-800",
      confirmado: "bg-green-100 text-green-800",
      cancelado: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      pendiente_pago: "Pendiente pago",
      confirmado: "Confirmado",
      cancelado: "Cancelado",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[estado] || "bg-gray-100"}`}>
        {labels[estado] || estado}
      </span>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Agenda</h1>

      <div className="flex gap-4 mb-6">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2"
        />
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente_pago">Pendiente pago</option>
          <option value="confirmado">Confirmado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Servicio</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {appointments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No hay turnos para esta fecha
                </td>
              </tr>
            )}
            {appointments.map((apt) => (
              <tr key={apt.id}>
                <td className="px-4 py-3 text-sm">
                  {new Date(apt.fechaHoraInicio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 text-sm font-medium">{apt.nombreCliente}</td>
                <td className="px-4 py-3 text-sm">{apt.telefonoCliente}</td>
                <td className="px-4 py-3 text-sm">{apt.service?.nombre}</td>
                <td className="px-4 py-3">{statusBadge(apt.estado)}</td>
                <td className="px-4 py-3">
                  {apt.estado !== "cancelado" && (
                    <button
                      onClick={() => cancelAppointment(apt.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
