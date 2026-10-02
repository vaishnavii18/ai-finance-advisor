import { Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Forecast from "./pages/Forecast";
import Anomalies from "./pages/Anomalies";
import Budget from "./pages/Budget";
import Explainability from "./pages/Explainability";
import Advisor from "./pages/Advisor";
import Settings from "./pages/Settings";

function App() {
  return (
    <Routes>
      {/* Public authentication pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected application */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="*"
          element={
            <div className="flex min-h-screen bg-[#f8fafc]">
              <Sidebar />

              <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/forecast" element={<Forecast />} />
                    <Route path="/anomalies" element={<Anomalies />} />
                    <Route path="/budget" element={<Budget />} />

                    <Route
                      path="/explainability"
                      element={<Explainability />}
                    />

                    <Route
                      path="/advisor"
                      element={<Advisor />}
                    />

                    <Route
                      path="/settings"
                      element={<Settings />}
                    />
                  </Routes>
                </div>
              </main>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;