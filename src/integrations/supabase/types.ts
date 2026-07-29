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
      academias: {
        Row: {
          cnpj: string | null
          created_at: string
          fuso_horario: string
          id: string
          logo_url: string | null
          nome: string
          plano_saas: string
          status: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          fuso_horario?: string
          id?: string
          logo_url?: string | null
          nome: string
          plano_saas?: string
          status?: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          fuso_horario?: string
          id?: string
          logo_url?: string | null
          nome?: string
          plano_saas?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      alunos: {
        Row: {
          academia_id: string
          created_at: string
          hash_biometria_digital: string | null
          id: string
          nome: string
          personal_id: string | null
          plano: string
          profile_id: string | null
          status_financeiro: Database["public"]["Enums"]["status_financeiro"]
          updated_at: string
          valor_plano: number
          vetor_facial: string | null
        }
        Insert: {
          academia_id: string
          created_at?: string
          hash_biometria_digital?: string | null
          id?: string
          nome: string
          personal_id?: string | null
          plano?: string
          profile_id?: string | null
          status_financeiro?: Database["public"]["Enums"]["status_financeiro"]
          updated_at?: string
          valor_plano?: number
          vetor_facial?: string | null
        }
        Update: {
          academia_id?: string
          created_at?: string
          hash_biometria_digital?: string | null
          id?: string
          nome?: string
          personal_id?: string | null
          plano?: string
          profile_id?: string | null
          status_financeiro?: Database["public"]["Enums"]["status_financeiro"]
          updated_at?: string
          valor_plano?: number
          vetor_facial?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alunos_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      aulas: {
        Row: {
          academia_id: string
          created_at: string
          horario: string
          id: string
          nome: string
          professor: string
          updated_at: string
          vagas: number
        }
        Insert: {
          academia_id: string
          created_at?: string
          horario: string
          id?: string
          nome: string
          professor: string
          updated_at?: string
          vagas?: number
        }
        Update: {
          academia_id?: string
          created_at?: string
          horario?: string
          id?: string
          nome?: string
          professor?: string
          updated_at?: string
          vagas?: number
        }
        Relationships: [
          {
            foreignKeyName: "aulas_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          academia_id: string
          aluno_id: string
          avaliador_id: string | null
          created_at: string
          dados: Json
          id: string
        }
        Insert: {
          academia_id: string
          aluno_id: string
          avaliador_id?: string | null
          created_at?: string
          dados?: Json
          id?: string
        }
        Update: {
          academia_id?: string
          aluno_id?: string
          avaliador_id?: string | null
          created_at?: string
          dados?: Json
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_avaliador_id_fkey"
            columns: ["avaliador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_cargas_treino: {
        Row: {
          academia_id: string
          aluno_id: string
          carga: number
          created_at: string
          exercicio_nome: string
          id: string
          reps_realizadas: string | null
        }
        Insert: {
          academia_id: string
          aluno_id: string
          carga: number
          created_at?: string
          exercicio_nome: string
          id?: string
          reps_realizadas?: string | null
        }
        Update: {
          academia_id?: string
          aluno_id?: string
          carga?: number
          created_at?: string
          exercicio_nome?: string
          id?: string
          reps_realizadas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_cargas_treino_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_cargas_treino_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          academia_id: string
          created_at: string
          estoque_atual: number
          id: string
          nome: string
          preco: number
          updated_at: string
        }
        Insert: {
          academia_id: string
          created_at?: string
          estoque_atual?: number
          id?: string
          nome: string
          preco?: number
          updated_at?: string
        }
        Update: {
          academia_id?: string
          created_at?: string
          estoque_atual?: number
          id?: string
          nome?: string
          preco?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academia_atual_id: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          academia_atual_id?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome: string
          updated_at?: string
        }
        Update: {
          academia_atual_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_academia_atual_id_fkey"
            columns: ["academia_atual_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
        ]
      }
      recorrencias: {
        Row: {
          academia_id: string
          aluno_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["status_recorrencia"]
          updated_at: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          academia_id: string
          aluno_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["status_recorrencia"]
          updated_at?: string
          valor: number
          vencimento?: string | null
        }
        Update: {
          academia_id?: string
          aluno_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["status_recorrencia"]
          updated_at?: string
          valor?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recorrencias_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recorrencias_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinos: {
        Row: {
          academia_id: string
          aluno_id: string
          created_at: string
          created_by: string | null
          exercicios: Json
          id: string
          updated_at: string
        }
        Insert: {
          academia_id: string
          aluno_id: string
          created_at?: string
          created_by?: string | null
          exercicios?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          academia_id?: string
          aluno_id?: string
          created_at?: string
          created_by?: string | null
          exercicios?: Json
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinos_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          academia_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          academia_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          academia_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          academia_id: string
          aluno_id: string | null
          created_at: string
          created_by: string | null
          id: string
          items: Json
          total: number
        }
        Insert: {
          academia_id: string
          aluno_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          total?: number
        }
        Update: {
          academia_id?: string
          aluno_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "DONO" | "ADMIN" | "PERSONAL" | "ALUNO"
      status_financeiro: "ADIMPLENTE" | "INADIMPLENTE"
      status_recorrencia: "PENDENTE" | "PAGO" | "ATRASADO" | "CANCELADO"
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
      app_role: ["DONO", "ADMIN", "PERSONAL", "ALUNO"],
      status_financeiro: ["ADIMPLENTE", "INADIMPLENTE"],
      status_recorrencia: ["PENDENTE", "PAGO", "ATRASADO", "CANCELADO"],
    },
  },
} as const
