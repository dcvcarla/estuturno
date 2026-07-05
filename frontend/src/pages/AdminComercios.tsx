import { useEffect, useState } from "react";
import { api, setTokens } from "../api/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Commerce {
  id: number;
  nombre: string;
  dominio: string;
  telefonoWhatsapp: string | null;
  phoneNumberId: string | null;
  createdAt: string;
  _count: { services: number; appointments: number };
}

export function AdminComercios() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", dominio: "", telefonoWhatsapp: "", adminEmail: "", adminPassword: "", adminNombre: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    api<Commerce[]>("/api/commerce/list")
      .then(setCommerces)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const commerce = await api<Commerce>("/api/commerce", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setCommerces((prev) => [...prev, commerce as any]);
      setShowModal(false);
      setForm({ nombre: "", dominio: "", telefonoWhatsapp: "", adminEmail: "", adminPassword: "", adminNombre: "" });
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este comercio? Se borrarán todos sus datos.")) return;
    try {
      await api(`/api/commerce/${id}`, { method: "DELETE" });
      setCommerces((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleImpersonate(commerceId: number) {
    try {
      const data = await api<{ accessToken: string; refreshToken: string }>("/api/auth/impersonate", {
        method: "POST",
        body: JSON.stringify({ commerceId }),
      });
      setTokens(data.accessToken, data.refreshToken);
      window.location.href = "/gestion";
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (admin?.role !== "owner") {
    return <p className="text-gray-500">Acceso restringido a owners.</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Comercios</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          + Nuevo comercio
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dominio</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Servicios</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Turnos</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {commerces.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 text-sm font-medium">{c.nombre}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.dominio}</td>
                <td className="px-4 py-3 text-sm">{c._count.services}</td>
                <td className="px-4 py-3 text-sm">{c._count.appointments}</td>
                <td className="px-4 py-3 text-sm">{c.phoneNumberId ? "✅" : "—"}</td>
                <td className="px-4 py-3 text-sm space-x-2">
                  <button
                    onClick={() => handleImpersonate(c.id)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Ver como manager
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Nuevo comercio</h2>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <form onSubmit={handleCreate} className="space-y-3">
              <input placeholder="Nombre del negocio" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input placeholder="Dominio (ej: mipelu.com)" value={form.dominio} onChange={(e) => setForm({ ...form, dominio: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input placeholder="Teléfono WhatsApp (opcional)" value={form.telefonoWhatsapp} onChange={(e) => setForm({ ...form, telefonoWhatsapp: e.target.value })} className="w-full border rounded px-3 py-2" />
              <input placeholder="Email del admin" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input placeholder="Contraseña del admin" type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input placeholder="Nombre del admin (opcional)" value={form.adminNombre} onChange={(e) => setForm({ ...form, adminNombre: e.target.value })} className="w-full border rounded px-3 py-2" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
