import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BookOpen, LayoutDashboard, Database, Sparkles, FileLock2,
  Heart, Shield, LogOut, Stethoscope, Scissors, Baby, HeartPulse, Activity,
  Clock, AlertTriangle, Settings,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/console/Logo";
import BlurEdges from "@/components/console/BlurEdges";
import { feedback } from "@/lib/sensory";
import { useSettings } from "@/contexts/SettingsContext";

function AppSidebar() {
  const { state, isMobile, setOpen, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { isAdmin: isAuthAdmin, signOut, user } = useAuth();
  const isAdmin = isAuthAdmin || user?.email === 'joaoresende2603@gmail.com';
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");
  const handleNav = () => {
    feedback("flip");
    if (isMobile) setOpenMobile(false);
    else setOpen(false);
  };

  const main = [
    { title: "Estudar", url: "/estudo", icon: BookOpen },
    { title: "Área do aluno", url: "/dashboard", icon: LayoutDashboard },
  ];
  const especialidades = [
    { title: "Clínica Médica", url: "/estudo?esp=clinica_medica", icon: Stethoscope },
    { title: "Cirurgia Geral", url: "/estudo?esp=cirurgia_geral", icon: Scissors },
    { title: "Pediatria", url: "/estudo?esp=pediatria", icon: Baby },
    { title: "Ginecologia/Obs", url: "/estudo?esp=ginecologia_obstetricia", icon: HeartPulse },
    { title: "Med. Preventiva", url: "/estudo?esp=medicina_preventiva", icon: Activity },
  ];
  const extras = [
    { title: "Favoritos", url: "/favoritos", icon: Heart },
    { title: "Banco de OQs", url: "/banco-cards", icon: Database },
    { title: "Gerar OQs", url: "/gerar-oqs", icon: Sparkles },
    { title: "Materiais", url: "/materiais", icon: FileLock2 },
    { title: "Configurações", url: "/configuracoes", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarContent className="bg-sidebar">
        <div className="px-4 py-8 flex items-center justify-center">
          {!collapsed ? (
            <Logo size={180} shadow="lg" />
          ) : (
            <Logo size={42} shadow="md" />
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em]">Estudo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)} onClick={handleNav}>
                    <NavLink to={i.url}><i.icon className="h-4 w-4" />{!collapsed && <span>{i.title}</span>}</NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em]">Especialidades</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {especialidades.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild onClick={handleNav}>
                    <NavLink to={i.url}><i.icon className="h-4 w-4" />{!collapsed && <span>{i.title}</span>}</NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em]">Mais</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {extras.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url.split("?")[0])} onClick={handleNav}>
                    <NavLink to={i.url}><i.icon className="h-4 w-4" />{!collapsed && <span>{i.title}</span>}</NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin")} onClick={handleNav}>
                    <NavLink to="/admin"><Shield className="h-4 w-4" />{!collapsed && <span>Painel do Administrador</span>}</NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-3">
          <button onClick={signOut} className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-xl hover:bg-[hsl(var(--muted))] transition">
            <LogOut className="h-4 w-4" />{!collapsed && "Sair"}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

function TrialBanner() {
  const { user } = useAuth();
  const [info, setInfo] = useState<{ status: string; plano: string; diasRestantes?: number; diasInad?: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("assinaturas").select("*").eq("usuario_id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      if (data.status === "trial" && data.data_fim_trial) {
        const dias = Math.ceil((new Date(data.data_fim_trial).getTime() - Date.now()) / 86400000);
        setInfo({ status: "trial", plano: data.plano, diasRestantes: Math.max(0, dias) });
      } else if (data.status === "inadimplente") {
        setInfo({ status: "inadimplente", plano: data.plano, diasInad: data.dias_inadimplente });
      } else if (data.status === "ativo") {
        setInfo({ status: "ativo", plano: data.plano });
      }
    });
  }, [user]);

  if (!info || info.status === "ativo") return null;

  return (
    <div className="px-4 py-2 text-sm flex items-center">
      {info.status === "trial" && (
        <Badge 
          variant="secondary" 
          className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors rounded-full px-3 py-1 flex items-center gap-1.5 font-semibold"
        >
          <Clock className="h-3.5 w-3.5" />
          {info.diasRestantes} {info.diasRestantes === 1 ? "dia grátis" : "dias grátis"} restantes
        </Badge>
      )}
      {info.status === "inadimplente" && (
        <Badge variant="destructive" className="rounded-full px-3 py-1 flex items-center gap-1.5 font-bold animate-pulse">
          <AlertTriangle className="h-3.5 w-3.5" />
          Irregularidade detectada — a inadimplência acarretará na exclusão definitiva de dados estatísticos e materiais gerados em {15 - (info.diasInad ?? 0)} dias.
        </Badge>
      )}
    </div>
  );
}

export default function AppLayout() {
  const { theme } = useSettings();
  const location = useLocation();


  return (
    <SidebarProvider>
      {location.pathname !== "/estudo" && <BlurEdges />}
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/60 backdrop-blur bg-background/70 sticky top-0 z-20">
            <SidebarTrigger className="ml-2" />
            <div className="flex-1" />
            <div className="hidden md:block mr-4"><Logo size={48} shadow="md" /></div>
            <TrialBanner />
          </header>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
