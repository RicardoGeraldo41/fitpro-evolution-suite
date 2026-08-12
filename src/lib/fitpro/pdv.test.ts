import { describe, expect, it } from "vitest";
import { mapVendaError, vendaSchema } from "./pdv.functions";

const uid = "11111111-1111-1111-1111-111111111111";

describe("vendaSchema (contrato enviado ao servidor)", () => {
  it("aceita venda simples", () => {
    const r = vendaSchema.parse({
      itens: [{ produto_id: uid, quantidade: 1 }],
      forma: "DINHEIRO",
    });
    expect(r.itens).toHaveLength(1);
  });

  it("aceita múltiplos produtos", () => {
    const r = vendaSchema.parse({
      itens: [
        { produto_id: uid, quantidade: 2 },
        { produto_id: "22222222-2222-2222-2222-222222222222", quantidade: 3 },
      ],
      forma: "PIX",
    });
    expect(r.itens).toHaveLength(2);
  });

  it("rejeita carrinho vazio", () => {
    expect(() => vendaSchema.parse({ itens: [], forma: "PIX" })).toThrow();
  });

  it("rejeita quantidade zero ou negativa", () => {
    expect(() =>
      vendaSchema.parse({ itens: [{ produto_id: uid, quantidade: 0 }], forma: "PIX" }),
    ).toThrow();
    expect(() =>
      vendaSchema.parse({ itens: [{ produto_id: uid, quantidade: -3 }], forma: "PIX" }),
    ).toThrow();
  });

  it("ignora preço/total/academia enviados pelo cliente", () => {
    const r = vendaSchema.parse({
      itens: [{ produto_id: uid, quantidade: 1, preco: 0.01 }],
      forma: "PIX",
      total: 0.01,
      academia_id: uid,
    }) as Record<string, unknown>;
    expect(r["total"]).toBeUndefined();
    expect(r["academia_id"]).toBeUndefined();
    expect(Object.keys(r.itens as object[])).toHaveLength(1);
    expect((r.itens as Record<string, unknown>[])[0]!["preco"]).toBeUndefined();
  });

  it("rejeita forma de pagamento desconhecida", () => {
    expect(() =>
      vendaSchema.parse({ itens: [{ produto_id: uid, quantidade: 1 }], forma: "CHEQUE" }),
    ).toThrow();
  });
});

describe("mapVendaError (erros seguros)", () => {
  it("estoque insuficiente com nome do produto", () => {
    expect(mapVendaError('ESTOQUE_INSUFICIENTE:Whey 900g')).toContain("Whey 900g");
  });
  it("produto inexistente", () => {
    expect(mapVendaError("PRODUTO_INVALIDO")).toMatch(/inexistente/i);
  });
  it("sem permissão", () => {
    expect(mapVendaError("SEM_PERMISSAO")).toMatch(/permiss/i);
  });
  it("academia inválida", () => {
    expect(mapVendaError("ACADEMIA_INVALIDA")).toMatch(/Academia/i);
  });
  it("violação de estoque negativo vira mensagem de negócio", () => {
    expect(mapVendaError('new row violates check constraint "produtos_estoque_nao_negativo"')).toBe(
      "Estoque insuficiente.",
    );
  });
  it("não vaza detalhes internos", () => {
    const msg = mapVendaError("PGRST301 at pg_catalog.pg_proc line 42: relation vendas");
    expect(msg).toBe("Não foi possível finalizar a venda. Tente novamente.");
  });
});
