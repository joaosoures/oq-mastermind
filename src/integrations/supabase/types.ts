export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assinaturas: {
        Row: {
          atualizado_em: string
          criado_em: string
          data_fim_trial: string
          data_inicio_plano: string | null
          data_inicio_trial: string
          data_ultima_cobranca: string | null
          dias_inadimplente: number
          excluir_dados_em: string | null
          id: string
          plano: Database["public"]["Enums"]["plano"]
          status: Database["public"]["Enums"]["status_assinatura"]
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          data_fim_trial?: string
          data_inicio_plano?: string | null
          data_inicio_trial?: string
          data_ultima_cobranca?: string | null
          dias_inadimplente?: number
          excluir_dados_em?: string | null
          id?: string
          plano?: Database["public"]["Enums"]["plano"]
          status?: Database["public"]["Enums"]["status_assinatura"]
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          data_fim_trial?: string
          data_inicio_plano?: string | null
          data_inicio_trial?: string
          data_ultima_cobranca?: string | null
          dias_inadimplente?: number
          excluir_dados_em?: string | null
          id?: string
          plano?: Database["public"]["Enums"]["plano"]
          status?: Database["public"]["Enums"]["status_assinatura"]
          usuario_id?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          alternativa_a: string | null
          alternativa_b: string | null
          alternativa_c: string | null
          alternativa_correta: string | null
          alternativa_d: string | null
          alternativa_e: string | null
          atualizado_em: string
          comando: string
          criado_em: string
          criado_por_usuario_id: string | null
          especialidade: Database["public"]["Enums"]["especialidade"]
          explicacao: string
          id: string
          info_1: string | null
          info_2: string | null
          info_3: string | null
          info_4: string | null
          info_5: string | null
          modo: Database["public"]["Enums"]["modo_oq"]
          origem: Database["public"]["Enums"]["origem_card"]
          peso_importancia: number
          var_1: string | null
          var_2: string | null
          var_3: string | null
          var_4: string | null
          var_5: string | null
          verificado: boolean
        }
        Insert: {
          alternativa_a?: string | null
          alternativa_b?: string | null
          alternativa_c?: string | null
          alternativa_correta?: string | null
          alternativa_d?: string | null
          alternativa_e?: string | null
          atualizado_em?: string
          comando: string
          criado_em?: string
          criado_por_usuario_id?: string | null
          especialidade: Database["public"]["Enums"]["especialidade"]
          explicacao: string
          id?: string
          info_1?: string | null
          info_2?: string | null
          info_3?: string | null
          info_4?: string | null
          info_5?: string | null
          modo: Database["public"]["Enums"]["modo_oq"]
          origem?: Database["public"]["Enums"]["origem_card"]
          peso_importancia?: number
          var_1?: string | null
          var_2?: string | null
          var_3?: string | null
          var_4?: string | null
          var_5?: string | null
          verificado?: boolean
        }
        Update: {
          alternativa_a?: string | null
          alternativa_b?: string | null
          alternativa_c?: string | null
          alternativa_correta?: string | null
          alternativa_d?: string | null
          alternativa_e?: string | null
          atualizado_em?: string
          comando?: string
          criado_em?: string
          criado_por_usuario_id?: string | null
          especialidade?: Database["public"]["Enums"]["especialidade"]
          explicacao?: string
          id?: string
          info_1?: string | null
          info_2?: string | null
          info_3?: string | null
          info_4?: string | null
          info_5?: string | null
          modo?: Database["public"]["Enums"]["modo_oq"]
          origem?: Database["public"]["Enums"]["origem_card"]
          peso_importancia?: number
          var_1?: string | null
          var_2?: string | null
          var_3?: string | null
          var_4?: string | null
          var_5?: string | null
          verificado?: boolean
        }
        Relationships: []
      }
      cards_pendentes_revisao: {
        Row: {
          criado_em: string
          geracao_id: string
          id: string
          payload: Json
          selecionado: boolean
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          geracao_id: string
          id?: string
          payload: Json
          selecionado?: boolean
          usuario_id: string
        }
        Update: {
          criado_em?: string
          geracao_id?: string
          id?: string
          payload?: Json
          selecionado?: boolean
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_pendentes_revisao_geracao_id_fkey"
            columns: ["geracao_id"]
            isOneToOne: false
            referencedRelation: "geracoes_ia"
            referencedColumns: ["id"]
          },
        ]
      }
      desempenho_cards: {
        Row: {
          atualizado_em: string
          card_id: string
          contador_acertos: number
          contador_erros: number
          contador_vezes: number
          criado_em: string
          id: string
          nivel_pista_ultima: number
          proxima_revisao: string | null
          score_prioridade: number
          timestamp_ultima: string | null
          ultima_nota: number | null
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          card_id: string
          contador_acertos?: number
          contador_erros?: number
          contador_vezes?: number
          criado_em?: string
          id?: string
          nivel_pista_ultima?: number
          proxima_revisao?: string | null
          score_prioridade?: number
          timestamp_ultima?: string | null
          ultima_nota?: number | null
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          card_id?: string
          contador_acertos?: number
          contador_erros?: number
          contador_vezes?: number
          criado_em?: string
          id?: string
          nivel_pista_ultima?: number
          proxima_revisao?: string | null
          score_prioridade?: number
          timestamp_ultima?: string | null
          ultima_nota?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "desempenho_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      favoritos: {
        Row: {
          card_id: string
          criado_em: string
          id: string
          usuario_id: string
        }
        Insert: {
          card_id: string
          criado_em?: string
          id?: string
          usuario_id: string
        }
        Update: {
          card_id?: string
          criado_em?: string
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favoritos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      geracoes_ia: {
        Row: {
          criado_em: string
          erro: string | null
          id: string
          nome_arquivo: string | null
          qtd_abcde: number | null
          qtd_lacuna: number | null
          qtd_oq_falta: number | null
          quantidade_gerada: number
          quantidade_solicitada: number
          status: Database["public"]["Enums"]["status_geracao"]
          tipo_arquivo: string
          usar_distribuicao_ia: boolean
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          erro?: string | null
          id?: string
          nome_arquivo?: string | null
          qtd_abcde?: number | null
          qtd_lacuna?: number | null
          qtd_oq_falta?: number | null
          quantidade_gerada?: number
          quantidade_solicitada: number
          status?: Database["public"]["Enums"]["status_geracao"]
          tipo_arquivo: string
          usar_distribuicao_ia?: boolean
          usuario_id: string
        }
        Update: {
          criado_em?: string
          erro?: string | null
          id?: string
          nome_arquivo?: string | null
          qtd_abcde?: number | null
          qtd_lacuna?: number | null
          qtd_oq_falta?: number | null
          quantidade_gerada?: number
          quantidade_solicitada?: number
          status?: Database["public"]["Enums"]["status_geracao"]
          tipo_arquivo?: string
          usar_distribuicao_ia?: boolean
          usuario_id?: string
        }
        Relationships: []
      }
      materiais: {
        Row: {
          ativo: boolean
          criado_em: string
          descricao: string | null
          drive_file_id: string | null
          duracao_audio: number | null
          especialidade: Database["public"]["Enums"]["especialidade"]
          id: string
          link_drive: string | null
          nome: string | null
          paginas_pdf: number | null
          tipo: Database["public"]["Enums"]["tipo_material"]
          titulo: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          descricao?: string | null
          drive_file_id?: string | null
          duracao_audio?: number | null
          especialidade: Database["public"]["Enums"]["especialidade"]
          id?: string
          link_drive?: string | null
          nome?: string | null
          paginas_pdf?: number | null
          tipo: Database["public"]["Enums"]["tipo_material"]
          titulo: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          descricao?: string | null
          drive_file_id?: string | null
          duracao_audio?: number | null
          especialidade?: Database["public"]["Enums"]["especialidade"]
          id?: string
          link_drive?: string | null
          nome?: string | null
          paginas_pdf?: number | null
          tipo?: Database["public"]["Enums"]["tipo_material"]
          titulo?: string
        }
        Relationships: []
      }
      problemas_admin: {
        Row: {
          atualizado_em: string
          card_id: string | null
          criado_em: string
          descricao: string | null
          id: string
          origem: string
          prioridade: Database["public"]["Enums"]["prioridade_problema"]
          report_id: string | null
          status: Database["public"]["Enums"]["status_problema"]
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          card_id?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          origem?: string
          prioridade?: Database["public"]["Enums"]["prioridade_problema"]
          report_id?: string | null
          status?: Database["public"]["Enums"]["status_problema"]
          titulo: string
        }
        Update: {
          atualizado_em?: string
          card_id?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          origem?: string
          prioridade?: Database["public"]["Enums"]["prioridade_problema"]
          report_id?: string | null
          status?: Database["public"]["Enums"]["status_problema"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "problemas_admin_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problemas_admin_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports_erro"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          atualizado_em: string
          criado_em: string
          email: string
          foto_url: string | null
          id: string
          nome: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          email: string
          foto_url?: string | null
          id: string
          nome?: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          email?: string
          foto_url?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      reports_erro: {
        Row: {
          card_id: string
          comentario: string | null
          criado_em: string
          id: string
          resolvido_em: string | null
          status: Database["public"]["Enums"]["status_report"]
          tipo: Database["public"]["Enums"]["tipo_report"]
          usuario_id: string
        }
        Insert: {
          card_id: string
          comentario?: string | null
          criado_em?: string
          id?: string
          resolvido_em?: string | null
          status?: Database["public"]["Enums"]["status_report"]
          tipo: Database["public"]["Enums"]["tipo_report"]
          usuario_id: string
        }
        Update: {
          card_id?: string
          comentario?: string | null
          criado_em?: string
          id?: string
          resolvido_em?: string | null
          status?: Database["public"]["Enums"]["status_report"]
          tipo?: Database["public"]["Enums"]["tipo_report"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_erro_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      temp_oqs: {
        Row: {
          contexto_origem: string | null
          created_at: string
          especialidade: string
          explicacao: string | null
          id: string
          modo: string
          opcoes: Json | null
          pergunta: string
          resposta: string
          user_id: string
          variacoes: string | null
        }
        Insert: {
          contexto_origem?: string | null
          created_at?: string
          especialidade: string
          explicacao?: string | null
          id?: string
          modo: string
          opcoes?: Json | null
          pergunta: string
          resposta: string
          user_id: string
          variacoes?: string | null
        }
        Update: {
          contexto_origem?: string | null
          created_at?: string
          especialidade?: string
          explicacao?: string | null
          id?: string
          modo?: string
          opcoes?: Json | null
          pergunta?: string
          resposta?: string
          user_id?: string
          variacoes?: string | null
        }
        Relationships: []
      }
      user_excluded_cards: {
        Row: {
          card_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_excluded_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          criado_em: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "usuario"
      especialidade:
        | "clinica_medica"
        | "cirurgia_geral"
        | "pediatria"
        | "ginecologia_obstetricia"
        | "medicina_preventiva"
      modo_oq: "abcde" | "lacuna" | "oq_falta"
      origem_card: "admin" | "usuario" | "ia_pdf" | "ia_csv" | "material_ouro"
      plano: "trial" | "prata" | "ouro"
      prioridade_problema: "baixa" | "media" | "alta" | "critica"
      status_assinatura: "ativo" | "trial" | "inadimplente" | "cancelado"
      status_geracao: "processando" | "concluido" | "erro"
      status_problema: "aberto" | "em_andamento" | "resolvido"
      status_report: "pendente" | "resolvido" | "ignorado"
      tipo_material: "pdf" | "audio"
      tipo_report:
        | "conteudo_incorreto"
        | "erro_digitacao"
        | "ambiguidade"
        | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "usuario"],
      especialidade: [
        "clinica_medica",
        "cirurgia_geral",
        "pediatria",
        "ginecologia_obstetricia",
        "medicina_preventiva",
      ],
      modo_oq: ["abcde", "lacuna", "oq_falta"],
      origem_card: ["admin", "usuario", "ia_pdf", "ia_csv", "material_ouro"],
      plano: ["trial", "prata", "ouro"],
      prioridade_problema: ["baixa", "media", "alta", "critica"],
      status_assinatura: ["ativo", "trial", "inadimplente", "cancelado"],
      status_geracao: ["processando", "concluido", "erro"],
      status_problema: ["aberto", "em_andamento", "resolvido"],
      status_report: ["pendente", "resolvido", "ignorado"],
      tipo_material: ["pdf", "audio"],
      tipo_report: [
        "conteudo_incorreto",
        "erro_digitacao",
        "ambiguidade",
        "outro",
      ],
    },
  },
} as const
