import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Finalização de venda do PDV.
 * O cliente envia apenas produto_id + quantidade (e forma de pagamento).
 * Preço, total, estoque e academia são resolvidos exclusivamente no servidor,
 * dentro da função transacional public.finalizar_venda.
 */
export const vendaSchema = z.object({
  itens: z
    .array(
      z.object({
        produto_id: z.string().uuid(),
        quantidade: z.number().int().positive().max(9999),
      }),
    )
    .min(1)
    .max(200),
  forma: z.enum(["DINHEIRO", "PIX", "DEBITO", "CREDITO", "BOLETO", "CORTESIA"]),
  aluno_id: z.string().uuid().nullable().optional(),
});

export type VendaInput = z.infer<typeof vendaSchema>;

/** Traduz erros do banco em mensagens seguras (sem stack trace / detalhes internos). */
export function mapVendaError(raw: string | undefined): string {
  const m = raw ?? "";
  if (m.includes("ESTOQUE_INSUFICIENTE")) {
    const nome = m.split("ESTOQUE_INSUFICIENTE:")[1]?.split("\n")[0]?.trim();
    return nome ? `Estoque insuficiente para "${nome}".` : "Estoque insuficiente.";
  }
  if (m.includes("PRODUTO_INVALIDO")) return "Produto inexistente ou de outra academia.";
  if (m.includes("QUANTIDADE_INVALIDA")) return "Quantidade inválida.";
  if (m.includes("CARRINHO_VAZIO")) return "Carrinho vazio.";
  if (m.includes("SEM_PERMISSAO")) return "Você não tem permissão para operar o PDV.";
  if (m.includes("ACADEMIA_INVALIDA")) return "Academia inválida para este usuário.";
  if (m.includes("ALUNO_INVALIDO")) return "Aluno inválido para esta academia.";
  if (m.includes("FORMA_PAGAMENTO_INVALIDA")) return "Forma de pagamento inválida.";
  if (m.includes("NAO_AUTENTICADO")) return "Sessão expirada. Entre novamente.";
  if (m.includes("produtos_estoque_nao_negativo")) return "Estoque insuficiente.";
  return "Não foi possível finalizar a venda. Tente novamente.";
}

export const finalizarVenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => vendaSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("finalizar_venda", {
      p_itens: data.itens,
      p_forma: data.forma,
      p_aluno_id: data.aluno_id ?? undefined,
    });

    if (error) {
      console.error("[PDV] finalizar_venda falhou:", error.message);
      throw new Error(mapVendaError(error.message));
    }

    const out = result as { venda_id: string; total: number } | null;
    if (!out) throw new Error("Não foi possível finalizar a venda. Tente novamente.");
    return { venda_id: out.venda_id, total: Number(out.total) };
  });
