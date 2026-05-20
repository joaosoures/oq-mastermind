import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useNavigate, useLocation } from "react-router-dom";

export default function OnboardingFlow({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useOnboarding();
  const driverRef = useRef<any>(null);

  const handleFinish = async (completed: boolean) => {
    if (!user) return;
    
    const updateData = completed 
      ? { onboarding_completed: true, onboarding_completed_at: new Date().toISOString() }
      : { onboarding_skipped: true };

    await supabase
      .from("profiles")
      .update(updateData as any)
      .eq("id", user.id);
    
    await refresh();
    
    if (completed) onComplete();
    else onSkip();
  };

  useEffect(() => {
    const startTour = () => {
      const d = driver({
        showProgress: true,
        animate: true,
        overlayColor: "rgba(0, 0, 0, 0.75)",
        allowClose: true,
        doneBtnText: "Finalizar",
        nextBtnText: "Próximo",
        prevBtnText: "Anterior",
        progressText: "{{current}} de {{total}}",
        onDeselected: (element, step, { state }) => {
          if (state.status === "closed") {
             handleFinish(true);
          }
        },
        onDestroyed: () => {
          handleFinish(true);
        },
        steps: [
          {
            element: "body",
            popover: {
              title: "Bem-vindo ao OQ.Med! 👋",
              description: "Vamos fazer um tour rápido para você dominar a plataforma em 2 minutos. Você tem 7 dias de acesso total liberado!",
              side: "center",
              align: "start"
            }
          },
          {
            element: '[href="/trilha"]',
            popover: {
              title: "Trilha Estratégica 🗺️",
              description: "Aqui é onde a mágica acontece. O algoritmo organiza o que você deve estudar hoje com base no que mais cai nas provas.",
              side: "right",
              align: "start"
            }
          },
          {
            element: '[href="/estudo"]',
            popover: {
              title: "Hora de Estudar 📖",
              description: "Clique aqui para começar a responder os OQs. É através das questões que o sistema aprende seu nível e calibra seu estudo.",
              side: "right",
              align: "start"
            }
          },
          {
            element: '[href="/materiais"]',
            popover: {
              title: "Biblioteca Premium 📚",
              description: "Acesse resumos em PDF e materiais de apoio focados no que realmente importa.",
              side: "right",
              align: "start"
            }
          },
          {
            element: '[href="/meu-plano"]',
            popover: {
              title: "Seu Plano 💳",
              description: "Acompanhe seu período de Trial e gerencie sua assinatura. Lembre-se: após o trial, o custo é de apenas R$ 0,72/dia.",
              side: "right",
              align: "start"
            }
          },
          {
            popover: {
              title: "Tudo pronto! 🚀",
              description: "Agora é com você. Bons estudos e conte conosco na sua jornada para a aprovação!",
              side: "center",
              align: "start"
            }
          }
        ]
      });

      d.drive();
      driverRef.current = d;

      const interval = setInterval(() => {
        if (!d.isActive()) {
          clearInterval(interval);
          handleFinish(true);
        }
      }, 500);
    };

    const timer = setTimeout(startTour, 1000);
    return () => {
      clearTimeout(timer);
      if (driverRef.current) driverRef.current.destroy();
    };
  }, []);

  return null;
}
