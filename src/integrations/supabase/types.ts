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
      alunos: {
        Row: {
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
          created_at: string
          horario: string
          id: string
          nome: string
          professor: string
          updated_at: string
          vagas: number
        }
        Insert: {
          created_at?: string
          horario: string
          id?: string
          nome: string
          professor: string
          updated_at?: string
          vagas?: number
        }
        Update: {
          created_at?: string
          horario?: string
          id?: string
          nome?: string
          professor?: string
          updated_at?: string
          vagas?: number
        }
        Relationships: []
      }
      avaliacoes: {
        Row: {
          aluno_id: string
          avaliador_id: string | null
          created_at: string
          dados: Json
          id: string
        }
        Insert: {
          aluno_id: string
          avaliador_id?: string | null
          created_at?: string
          dados?: Json
          id?: string
        }
        Update: {
          aluno_id?: string
          avaliador_id?: string | null
          created_at?: string
          dados?: Json
          id?: string
        }
        Relationships: [
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
          aluno_id: string
          carga: number
          created_at: string
          exercicio_nome: string
          id: string
          reps_realizadas: string | null
        }
        Insert: {
          aluno_id: string
          carga: number
          created_at?: string
          exercicio_nome: string
          id?: string
          reps_realizadas?: string | null
        }
        Update: {
          aluno_id?: string
          carga?: number
          created_at?: string
          exercicio_nome?: string
          id?: string
          reps_realizadas?: string | null
        }
        Relationships: [
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
          created_at: string
          estoque_atual: number
          id: string
          nome: string
          preco: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          estoque_atual?: number
          id?: string
          nome: string
          preco?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          estoque_atual?: number
          id?: string
          nome?: string
          preco?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      recorrencias: {
        Row: {
          aluno_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["status_recorrencia"]
          updated_at: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          aluno_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["status_recorrencia"]
          updated_at?: string
          valor: number
          vencimento?: string | null
        }
        Update: {
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
          aluno_id: string
          created_at: string
          created_by: string | null
          exercicios: Json
          id: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          created_by?: string | null
          exercicios?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          created_by?: string | null
          exercicios?: Json
          id?: string
          updated_at?: string
        }
        Relationships: [
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
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          aluno_id: string | null
          created_at: string
          created_by: string | null
          id: string
          items: Json
          total: number
        }
        Insert: {
          aluno_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          total?: number
        }
        Update: {
          aluno_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          total?: number
        }
        Relationships: [
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
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
