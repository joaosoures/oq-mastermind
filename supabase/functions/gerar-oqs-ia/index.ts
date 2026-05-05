import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { text, fileName, specialty } = await req.json();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em educação médica. Gere entre 6 e 12 OQs (Questões de estudo) baseadas no texto fornecido.
            As questões devem ser de alta qualidade para revisão de residência médica.
            Formato de saída: JSON Array de objetos:
            {
              "pergunta": "...",
              "resposta": "...",
              "modo": "abcde" | "lacuna" | "oq_falta",
              "opcoes": ["A", "B", "C", "D", "E"] (apenas se modo for abcde)
            }
            Importante: a "resposta" no modo abcde deve ser o texto da opção correta.
            No modo lacuna, use [___] no texto da pergunta para indicar a lacuna.`
          },
          {
            role: "user",
            content: `Especialidade: ${specialty}\nOrigem: ${fileName}\nTexto:\n${text}`
          }
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    // Retorna a lista de questões (ajusta caso o GPT envolva em um objeto)
    const questions = Array.isArray(result) ? result : (result.questions || result.oqs || []);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
