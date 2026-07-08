import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, setTokens } from "../api/client";
import { useEffect, useState } from "react";

const managerLinks = [
  { to: "/gestion", label: "Dashboard", end: true },
  { to: "/gestion/agenda", label: "Agenda" },
  { to: "/gestion/servicios", label: "Servicios" },
  { to: "/gestion/configuracion", label: "Configuración" },
];

const ownerLinks = [
  { to: "/gestion", label: "Dashboard", end: true },
  { to: "/gestion/comercios", label: "Comercios" },
];

export function AdminLayout() {
  const { admin, logout, refreshAdmin } = useAuth();
  const navigate = useNavigate();
  const isOwner = admin?.role === "owner";
  const isImpersonating = admin?.impersonating;
  const links = isOwner ? ownerLinks : managerLinks;
  const [commerceData, setCommerceData] = useState<{ nombre: string; colorPrimario: string | null; colorSecundario: string | null; colorAcento: string | null } | null>(null);

  useEffect(() => {
    if (!isOwner && admin?.commerceId) {
      api<{ nombre: string; colorPrimario: string | null; colorSecundario: string | null; colorAcento: string | null }>("/api/commerce")
        .then(setCommerceData).catch(() => {});
    }
  }, [admin?.commerceId, isOwner]);

  const pc = !isOwner && commerceData?.colorPrimario ? commerceData.colorPrimario : "#4338ca";
  const sc = !isOwner && commerceData?.colorSecundario ? commerceData.colorSecundario : "#6366f1";

  async function handleUnimpersonate() {
    try {
      const data = await api<{ accessToken: string; refreshToken: string }>("/api/auth/unimpersonate", { method: "POST" });
      setTokens(data.accessToken, data.refreshToken);
      await refreshAdmin();
      navigate("/gestion");
    } catch {
      alert("Error al volver a owner");
    }
  }

  function handleLogout() {
    logout();
    navigate("/gestion/login");
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 text-white flex flex-col" style={{ backgroundColor: pc }}>
        <div className="p-4 border-b" style={{ borderColor: `${sc}88` }}>
          <h1 className="text-xl font-bold">{commerceData?.nombre || "EsTuTurno"}</h1>
          <p className="text-sm mt-1 opacity-80">{admin?.nombre || admin?.email}</p>
          {isOwner && <span className="text-xs text-yellow-300 mt-1 block">Owner</span>}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className="block px-3 py-2 rounded transition"
              style={({ isActive }) => ({
                backgroundColor: isActive ? sc : "transparent",
                color: "white",
                opacity: isActive ? 1 : 0.8,
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t space-y-2" style={{ borderColor: `${sc}88` }}>
          {isImpersonating && (
            <button
              onClick={handleUnimpersonate}
              className="w-full text-left text-yellow-300 hover:text-yellow-100 transition text-sm"
            >
              ← Volver a panel owner
            </button>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left transition text-sm"
            style={{ color: "white", opacity: 0.8 }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
