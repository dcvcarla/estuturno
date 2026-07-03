import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/agenda", label: "Agenda" },
  { to: "/admin/servicios", label: "Servicios" },
  { to: "/admin/configuracion", label: "Configuración" },
];

export function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/admin/login");
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-indigo-900 text-white flex flex-col">
        <div className="p-4 border-b border-indigo-800">
          <h1 className="text-xl font-bold">EsTuTurno</h1>
          <p className="text-sm text-indigo-300 mt-1">{admin?.nombre || admin?.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded transition ${
                  isActive ? "bg-indigo-700 text-white" : "text-indigo-200 hover:bg-indigo-800"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-indigo-800">
          <button
            onClick={handleLogout}
            className="w-full text-left text-indigo-300 hover:text-white transition"
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
