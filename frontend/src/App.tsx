import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminLogin } from "./pages/AdminLogin";
import { AdminLayout } from "./pages/AdminLayout";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminAgenda } from "./pages/AdminAgenda";
import { AdminServices } from "./pages/AdminServices";
import { AdminSettings } from "./pages/AdminSettings";
import { Landing } from "./pages/Landing";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="agenda" element={<AdminAgenda />} />
            <Route path="servicios" element={<AdminServices />} />
            <Route path="configuracion" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
