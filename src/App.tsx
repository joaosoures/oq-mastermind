import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Estudo from "@/pages/Estudo";
import Dashboard from "@/pages/Dashboard";
import BancoCards from "@/pages/BancoCards";
import GerarOQs from "@/pages/GerarOQs";
import Materiais from "@/pages/Materiais";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";

const qc = new QueryClient();

const App = () => (
  <QueryClientProvider client={qc}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Navigate to="/estudo" replace />} />
              <Route path="/estudo" element={<Estudo />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/favoritos" element={<Navigate to="/estudo?tipo=favoritos" replace />} />
              <Route path="/banco-cards" element={<BancoCards />} />
              <Route path="/gerar-oqs" element={<GerarOQs />} />
              <Route path="/materiais" element={<Materiais />} />
              <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
