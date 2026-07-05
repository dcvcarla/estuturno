import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Appointment {
  id: number;
  estado: string;
  nombreCliente: string;
  service: { nombre: string };
  fechaHoraInicio: string;
}

interface CommerceSummary {
  id: number;
  nombre: string;
  _count: { appointments: number; services: number };
}

export function AdminDashboard() {
  const { admin } = useAuth();
  const isOwner = admin?.role === "owner";

  if (isOwner) return <OwnerDashboard />;
  return <ManagerDashboard />;
}

function ManagerDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    api<Appointment[]>(`/api/appointments?from=${today}&to=${future}`)
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    pendiente_pago: appointments.filter((a) => a.estado === "pendiente_pago").length,
    confirmado: appointments.filter((a) => a.estado === "confirmado").length,
    cancelado: appointments.filter((a) => a.estado === "cancelado").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-600">Pendientes de pago</p>
          <p className="text-3xl font-bold text-yellow-800">{counts.pendiente_pago}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600">Confirmados</p>
          <p className="text-3xl font-bold text-green-800">{counts.confirmado}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">Cancelados</p>
          <p className="text-3xl font-bold text-red-800">{counts.cancelado}</p>
        </div>
      </div>
      <h2 className="text-lg font-semibold mb-3">Próximos turnos</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Servicio</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {appointments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No hay próximos turnos</td>
              </tr>
            )}
            {appointments.map((apt) => (
              <tr key={apt.id}>
                <td className="px-4 py-3 text-sm">{new Date(apt.fechaHoraInicio).toLocaleDateString("es-AR")}</td>
                <td className="px-4 py-3 text-sm">
                  {new Date(apt.fechaHoraInicio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 text-sm">{apt.nombreCliente}</td>
                <td className="px-4 py-3 text-sm">{apt.service?.nombre}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    apt.estado === "confirmado" ? "bg-green-100 text-green-800" :
                    apt.estado === "cancelado" ? "bg-red-100 text-red-800" :
                    "bg-yellow-100 text-yellow-800"
                  }`}>
                    {apt.estado === "pendiente_pago" ? "Pendiente pago" :
                     apt.estado === "confirmado" ? "Confirmado" : "Cancelado"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OwnerDashboard() {
  const [commerces, setCommerces] = useState<CommerceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<CommerceSummary[]>("/api/commerce/list")
      .then(setCommerces)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const totalAppointments = commerces.reduce((sum, c) => sum + c._count.appointments, 0);
  const totalServices = commerces.reduce((sum, c) => sum + c._count.services, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard Global</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-sm text-indigo-600">Comercios activos</p>
          <p className="text-3xl font-bold text-indigo-800">{commerces.length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600">Servicios totales</p>
          <p className="text-3xl font-bold text-blue-800">{totalServices}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-600">Turnos totales</p>
          <p className="text-3xl font-bold text-purple-800">{totalAppointments}</p>
        </div>
      </div>
      <h2 className="text-lg font-semibold mb-3">Resumen por comercio</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comercio</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Servicios</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Turnos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {commerces.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 text-sm font-medium">{c.nombre}</td>
                <td className="px-4 py-3 text-sm">{c._count.services}</td>
                <td className="px-4 py-3 text-sm">{c._count.appointments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
