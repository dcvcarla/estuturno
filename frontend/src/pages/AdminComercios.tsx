import { useEffect, useState } from "react";
import { api, setTokens } from "../api/client";
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

interface CommerceAdmin {
  id: number;
  email: string;
  nombre: string | null;
}

export function AdminComercios() {
  const { admin, refreshAdmin } = useAuth();
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", dominio: "", telefonoWhatsapp: "", adminEmail: "", adminPassword: "", adminNombre: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  const [editTarget, setEditTarget] = useState<Commerce | null>(null);
  const [editForm, setEditForm] = useState({ nombre: "", dominio: "", telefonoWhatsapp: "" });
  const [showEditModal, setShowEditModal] = useState(false);

  const [resetTarget, setResetTarget] = useState<{ commerceId: number; admins: CommerceAdmin[] } | null>(null);
  const [resetAdminId, setResetAdminId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);

  function generatePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let pwd = "";
    for (let i = 0; i < 16; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, adminPassword: pwd });
    setConfirmPassword(pwd);
  }

  useEffect(() => {
    api<Commerce[]>("/api/commerce/list")
      .then(setCommerces)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.adminPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    try {
      const commerce = await api<Commerce>("/api/commerce", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setCommerces((prev) => [...prev, commerce as any]);
      setShowModal(false);
      setForm({ nombre: "", dominio: "", telefonoWhatsapp: "", adminEmail: "", adminPassword: "", adminNombre: "" });
      setConfirmPassword("");
      setShowPassword(false);
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

  async function handleEdit(commerce: Commerce) {
    setEditTarget(commerce);
    setEditForm({ nombre: commerce.nombre, dominio: commerce.dominio, telefonoWhatsapp: commerce.telefonoWhatsapp || "" });
    setShowEditModal(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    try {
      await api(`/api/commerce/${editTarget.id}`, { method: "PUT", body: JSON.stringify(editForm) });
      setCommerces((prev) => prev.map((c) => c.id === editTarget.id ? { ...c, nombre: editForm.nombre, dominio: editForm.dominio, telefonoWhatsapp: editForm.telefonoWhatsapp || null } : c));
      setShowEditModal(false);
      setEditTarget(null);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleOpenReset(commerceId: number) {
    try {
      const admins = await api<CommerceAdmin[]>(`/api/commerce/${commerceId}/admins`);
      setResetTarget({ commerceId, admins });
      setResetAdminId(admins[0]?.id || null);
      setResetPassword("");
      setShowResetModal(true);
    } catch {
      alert("Error al obtener admins");
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget || !resetAdminId || !resetPassword) return;
    try {
      await api(`/api/commerce/${resetTarget.commerceId}/reset-password`, {
        method: "PUT",
        body: JSON.stringify({ adminId: resetAdminId, newPassword: resetPassword }),
      });
      setShowResetModal(false);
      alert("Contraseña actualizada");
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
                    onClick={() => handleEdit(c)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleImpersonate(c.id)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Ver como manager
                  </button>
                  <button
                    onClick={() => handleOpenReset(c.id)}
                    className="text-orange-600 hover:text-orange-800"
                  >
                    Reset pass
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
              <div className="relative">
                <input placeholder="Contraseña del admin" type={showPassword ? "text" : "password"} value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} className="w-full border rounded px-3 py-2 pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-lg">
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              <div className="flex gap-2">
                <input placeholder="Repetir contraseña" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="flex-1 border rounded px-3 py-2" required />
                <button type="button" onClick={generatePassword} className="px-3 py-2 bg-gray-100 border rounded text-sm text-gray-600 hover:bg-gray-200 whitespace-nowrap">
                  Generar
                </button>
              </div>
              {form.adminPassword && confirmPassword && form.adminPassword !== confirmPassword && (
                <p className="text-red-500 text-xs">Las contraseñas no coinciden</p>
              )}
              <input placeholder="Nombre del admin (opcional)" value={form.adminNombre} onChange={(e) => setForm({ ...form, adminNombre: e.target.value })} className="w-full border rounded px-3 py-2" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setConfirmPassword(""); setShowPassword(false); }} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Editar comercio</h2>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <input placeholder="Nombre del negocio" value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input placeholder="Dominio" value={editForm.dominio} onChange={(e) => setEditForm({ ...editForm, dominio: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input placeholder="Teléfono WhatsApp" value={editForm.telefonoWhatsapp} onChange={(e) => setEditForm({ ...editForm, telefonoWhatsapp: e.target.value })} className="w-full border rounded px-3 py-2" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowEditModal(false); setEditTarget(null); }} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetModal && resetTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Resetear contraseña</h2>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <select value={resetAdminId ?? ""} onChange={(e) => setResetAdminId(Number(e.target.value))} className="w-full border rounded px-3 py-2" required>
                {resetTarget.admins.map((a) => (
                  <option key={a.id} value={a.id}>{a.email} ({a.nombre || "sin nombre"})</option>
                ))}
              </select>
              <input placeholder="Nueva contraseña" type="text" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="w-full border rounded px-3 py-2" required />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowResetModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
