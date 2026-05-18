import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import Configuracoes from "@/pages/Configuracoes";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Estudo from "@/pages/Estudo";
import Dashboard from "@/pages/Dashboard";
import BancoCards from "@/pages/BancoCards";
import GerarOQs from "@/pages/GerarOQs";
import Materiais from "@/pages/Materiais";
import Admin from "@/pages/Admin";
import AdminGerarAulas from "@/pages/AdminGerarAulas";
import MeuPlano from "@/pages/MeuPlano";
import Status from "@/pages/Status";
import NotFound from "@/pages/NotFound";

const qc = new QueryClient();

const App = () => (
  <QueryClientProvider client={qc}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/estudo" element={<Estudo />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/favoritos" element={<Navigate to="/estudo?tipo=favoritos" replace />} />
                <Route path="/banco-cards" element={<BancoCards />} />
                <Route path="/gerar-oqs" element={<GerarOQs />} />
                <Route path="/materiais" element={<Materiais />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="/meu-plano" element={<MeuPlano />} />
                <Route path="/status" element={<Status />} />
                <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
                <Route path="/admin/gerar-aulas" element={<ProtectedRoute adminOnly><AdminGerarAulas /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
