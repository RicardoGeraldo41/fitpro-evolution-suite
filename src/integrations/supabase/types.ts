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
          cidade: string | null
          cnpj: string | null
          codigo_convite: string
          created_at: string
          estado: string | null
          fuso_horario: string
          id: string
          logo_url: string | null
          nome: string
          plano_saas: string
          responsavel: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          codigo_convite?: string
          created_at?: string
          estado?: string | null
          fuso_horario?: string
          id?: string
          logo_url?: string | null
          nome: string
          plano_saas?: string
          responsavel?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          codigo_convite?: string
          created_at?: string
          estado?: string | null
          fuso_horario?: string
          id?: string
          logo_url?: string | null
          nome?: string
          plano_saas?: string
          responsavel?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      acessos: {
        Row: {
          academia_id: string
          aluno_id: string | null
          created_at: string
          id: string
          metodo: Database["public"]["Enums"]["metodo_acesso"]
          motivo: string | null
          permitido: boolean
          registrado_por: string | null
        }
        Insert: {
          academia_id: string
          aluno_id?: string | null
          created_at?: string
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_acesso"]
          motivo?: string | null
          permitido: boolean
          registrado_por?: string | null
        }
        Update: {
          academia_id?: string
          aluno_id?: string | null
          created_at?: string
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_acesso"]
          motivo?: string | null
          permitido?: boolean
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acessos_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acessos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos: {
        Row: {
          academia_id: string
          aluno_id: string
          aula_id: string
          created_at: string
          data: string
          id: string
          status: Database["public"]["Enums"]["status_agendamento"]
          updated_at: string
        }
        Insert: {
          academia_id: string
          aluno_id: string
          aula_id: string
          created_at?: string
          data: string
          id?: string
          status?: Database["public"]["Enums"]["status_agendamento"]
          updated_at?: string
        }
        Update: {
          academia_id?: string
          aluno_id?: string
          aula_id?: string
          created_at?: string
          data?: string
          id?: string
          status?: Database["public"]["Enums"]["status_agendamento"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      alimentos: {
        Row: {
          academia_id: string
          carboidratos: number
          created_at: string
          gorduras: number
          id: string
          kcal: number
          nome: string
          proteinas: number
        }
        Insert: {
          academia_id: string
          carboidratos?: number
          created_at?: string
          gorduras?: number
          id?: string
          kcal?: number
          nome: string
          proteinas?: number
        }
        Update: {
          academia_id?: string
          carboidratos?: number
          created_at?: string
          gorduras?: number
          id?: string
          kcal?: number
          nome?: string
          proteinas?: number
        }
        Relationships: []
      }
      alunos: {
        Row: {
          academia_id: string
          contato_emergencia_fone: string | null
          contato_emergencia_nome: string | null
          cpf: string | null
          created_at: string
          data_matricula: string
          data_nascimento: string | null
          endereco: string | null
          hash_biometria_digital: string | null
          id: string
          nome: string
          observacoes_saude: string | null
          personal_id: string | null
          plano: string
          profile_id: string | null
          status: Database["public"]["Enums"]["status_aluno"]
          status_financeiro: Database["public"]["Enums"]["status_financeiro"]
          telefone: string | null
          updated_at: string
          valor_plano: number
          vetor_facial: string | null
        }
        Insert: {
          academia_id: string
          contato_emergencia_fone?: string | null
          contato_emergencia_nome?: string | null
          cpf?: string | null
          created_at?: string
          data_matricula?: string
          data_nascimento?: string | null
          endereco?: string | null
          hash_biometria_digital?: string | null
          id?: string
          nome: string
          observacoes_saude?: string | null
          personal_id?: string | null
          plano?: string
          profile_id?: string | null
          status?: Database["public"]["Enums"]["status_aluno"]
          status_financeiro?: Database["public"]["Enums"]["status_financeiro"]
          telefone?: string | null
          updated_at?: string
          valor_plano?: number
          vetor_facial?: string | null
        }
        Update: {
          academia_id?: string
          contato_emergencia_fone?: string | null
          contato_emergencia_nome?: string | null
          cpf?: string | null
          created_at?: string
          data_matricula?: string
          data_nascimento?: string | null
          endereco?: string | null
          hash_biometria_digital?: string | null
          id?: string
          nome?: string
          observacoes_saude?: string | null
          personal_id?: string | null
          plano?: string
          profile_id?: string | null
          status?: Database["public"]["Enums"]["status_aluno"]
          status_financeiro?: Database["public"]["Enums"]["status_financeiro"]
          telefone?: string | null
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
      audit_logs: {
        Row: {
          academia_id: string | null
          acao: string
          created_at: string
          entidade: string
          entidade_id: string | null
          id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          academia_id?: string | null
          acao: string
          created_at?: string
          entidade: string
          entidade_id?: string | null
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          academia_id?: string | null
          acao?: string
          created_at?: string
          entidade?: string
          entidade_id?: string | null
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      aulas: {
        Row: {
          academia_id: string
          capacidade: number
          created_at: string
          dia_semana: number
          duracao_min: number
          horario: string
          id: string
          nome: string
          professor: string
          updated_at: string
          vagas: number
        }
        Insert: {
          academia_id: string
          capacidade?: number
          created_at?: string
          dia_semana?: number
          duracao_min?: number
          horario: string
          id?: string
          nome: string
          professor: string
          updated_at?: string
          vagas?: number
        }
        Update: {
          academia_id?: string
          capacidade?: number
          created_at?: string
          dia_semana?: number
          duracao_min?: number
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
      conquistas: {
        Row: {
          codigo: string
          created_at: string
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          xp: number
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          xp?: number
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          xp?: number
        }
        Relationships: []
      }
      conquistas_usuario: {
        Row: {
          academia_id: string
          conquista_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          academia_id: string
          conquista_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          academia_id?: string
          conquista_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conquistas_usuario_conquista_id_fkey"
            columns: ["conquista_id"]
            isOneToOne: false
            referencedRelation: "conquistas"
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
      matriculas: {
        Row: {
          academia_id: string
          aluno_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          dia_vencimento: number
          id: string
          plano_id: string | null
          status: Database["public"]["Enums"]["status_matricula"]
          updated_at: string
          valor: number
        }
        Insert: {
          academia_id: string
          aluno_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          dia_vencimento?: number
          id?: string
          plano_id?: string | null
          status?: Database["public"]["Enums"]["status_matricula"]
          updated_at?: string
          valor?: number
        }
        Update: {
          academia_id?: string
          aluno_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          dia_vencimento?: number
          id?: string
          plano_id?: string | null
          status?: Database["public"]["Enums"]["status_matricula"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      medidas_corporais: {
        Row: {
          academia_id: string
          aluno_id: string
          braco: number | null
          cintura: number | null
          coxa: number | null
          created_at: string
          created_by: string | null
          data: string
          foto_costas: string | null
          foto_frente: string | null
          foto_lado: string | null
          id: string
          observacoes: string | null
          percentual_gordura: number | null
          peso: number | null
          quadril: number | null
          updated_at: string
        }
        Insert: {
          academia_id: string
          aluno_id: string
          braco?: number | null
          cintura?: number | null
          coxa?: number | null
          created_at?: string
          created_by?: string | null
          data?: string
          foto_costas?: string | null
          foto_frente?: string | null
          foto_lado?: string | null
          id?: string
          observacoes?: string | null
          percentual_gordura?: number | null
          peso?: number | null
          quadril?: number | null
          updated_at?: string
        }
        Update: {
          academia_id?: string
          aluno_id?: string
          braco?: number | null
          cintura?: number | null
          coxa?: number | null
          created_at?: string
          created_by?: string | null
          data?: string
          foto_costas?: string | null
          foto_frente?: string | null
          foto_lado?: string | null
          id?: string
          observacoes?: string | null
          percentual_gordura?: number | null
          peso?: number | null
          quadril?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medidas_corporais_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          academia_id: string
          aluno_id: string
          created_at: string
          created_by: string | null
          forma: Database["public"]["Enums"]["forma_pagamento"]
          id: string
          observacao: string | null
          pago_em: string
          recorrencia_id: string | null
          valor: number
        }
        Insert: {
          academia_id: string
          aluno_id: string
          created_at?: string
          created_by?: string | null
          forma?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          observacao?: string | null
          pago_em?: string
          recorrencia_id?: string | null
          valor: number
        }
        Update: {
          academia_id?: string
          aluno_id?: string
          created_at?: string
          created_by?: string | null
          forma?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          observacao?: string | null
          pago_em?: string
          recorrencia_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_recorrencia_id_fkey"
            columns: ["recorrencia_id"]
            isOneToOne: false
            referencedRelation: "recorrencias"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          academia_id: string
          ativo: boolean
          created_at: string
          duracao_meses: number
          id: string
          inclui_aulas: boolean
          nome: string
          updated_at: string
          valor: number
        }
        Insert: {
          academia_id: string
          ativo?: boolean
          created_at?: string
          duracao_meses?: number
          id?: string
          inclui_aulas?: boolean
          nome: string
          updated_at?: string
          valor?: number
        }
        Update: {
          academia_id?: string
          ativo?: boolean
          created_at?: string
          duracao_meses?: number
          id?: string
          inclui_aulas?: boolean
          nome?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "planos_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_alimentares: {
        Row: {
          academia_id: string
          aluno_id: string
          created_at: string
          created_by: string | null
          id: string
          nome: string
          refeicoes: Json
          updated_at: string
        }
        Insert: {
          academia_id: string
          aluno_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          refeicoes?: Json
          updated_at?: string
        }
        Update: {
          academia_id?: string
          aluno_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          refeicoes?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_alimentares_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      pontos_xp: {
        Row: {
          academia_id: string
          nivel: number
          updated_at: string
          user_id: string
          xp_total: number
        }
        Insert: {
          academia_id: string
          nivel?: number
          updated_at?: string
          user_id: string
          xp_total?: number
        }
        Update: {
          academia_id?: string
          nivel?: number
          updated_at?: string
          user_id?: string
          xp_total?: number
        }
        Relationships: []
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
      venda_itens: {
        Row: {
          academia_id: string
          created_at: string
          id: string
          nome_produto: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          subtotal: number
          venda_id: string
        }
        Insert: {
          academia_id: string
          created_at?: string
          id?: string
          nome_produto: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          subtotal: number
          venda_id: string
        }
        Update: {
          academia_id?: string
          created_at?: string
          id?: string
          nome_produto?: string
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          subtotal?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_itens_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_itens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
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
      finalizar_venda: {
        Args: { p_aluno_id?: string; p_forma?: string; p_itens: Json }
        Returns: Json
      }
      gerar_codigo_convite: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "DONO" | "ADMIN" | "PERSONAL" | "ALUNO"
      forma_pagamento:
        | "DINHEIRO"
        | "PIX"
        | "DEBITO"
        | "CREDITO"
        | "BOLETO"
        | "CORTESIA"
      metodo_acesso: "DIGITAL" | "FACIAL" | "MANUAL" | "QRCODE"
      status_agendamento: "CONFIRMADO" | "CANCELADO" | "PRESENTE" | "FALTA"
      status_aluno: "ATIVO" | "TRANCADO" | "CANCELADO"
      status_financeiro: "ADIMPLENTE" | "INADIMPLENTE"
      status_matricula: "ATIVA" | "TRANCADA" | "CANCELADA" | "VENCIDA"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      forma_pagamento: [
        "DINHEIRO",
        "PIX",
        "DEBITO",
        "CREDITO",
        "BOLETO",
        "CORTESIA",
      ],
      metodo_acesso: ["DIGITAL", "FACIAL", "MANUAL", "QRCODE"],
      status_agendamento: ["CONFIRMADO", "CANCELADO", "PRESENTE", "FALTA"],
      status_aluno: ["ATIVO", "TRANCADO", "CANCELADO"],
      status_financeiro: ["ADIMPLENTE", "INADIMPLENTE"],
      status_matricula: ["ATIVA", "TRANCADA", "CANCELADA", "VENCIDA"],
      status_recorrencia: ["PENDENTE", "PAGO", "ATRASADO", "CANCELADO"],
    },
  },
} as const
