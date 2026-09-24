import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { finalizarVenda } from "@/lib/fitpro/pdv.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/fitpro/session";
import { fmtBRL } from "@/lib/fitpro/utils";

export const Route = createFileRoute("/_authenticated/pdv")({
  head: () => ({
    meta: [
      { title: "PDV de Balcão — FitPro" },
      { name: "description", content: "Ponto de venda da recepção: produtos, estoque e fechamento de vendas." },
      { property: "og:title", content: "PDV de Balcão — FitPro" },
      { property: "og:description", content: "Venda rápida de produtos e suplementos na recepção da academia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PDVPage,
});

type Produto = { id: string; nome: string; preco: number; estoque_atual: number };
type CartItem = { id: string; nome: string; preco: number; qtd: number };

function PDVPage() {
  const { session } = useSession();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pagamento, setPagamento] = useState("DINHEIRO");
  const [log, setLog] = useState<string | null>(null);
  const finalizar = useServerFn(finalizarVenda);

  const load = useCallback(async () => {
    if (!session?.academia_id) return;
    const { data } = await supabase.from("produtos").select("*").eq("academia_id", session.academia_id).order("nome");
    setProdutos((data ?? []) as Produto[]);
  }, [session?.academia_id]);

  useEffect(() => { load(); }, [load]);

  function add(p: Produto) {
    if (p.estoque_atual <= 0) { toast.error("Sem estoque"); return; }
    setCart((c) => {
      const ex = c.find((x) => x.id === p.id);
      if (ex) return c.map((x) => x.id === p.id ? { ...x, qtd: x.qtd + 1 } : x);
      return [...c, { id: p.id, nome: p.nome, preco: Number(p.preco), qtd: 1 }];
    });
  }

  const total = cart.reduce((s, i) => s + i.preco * i.qtd, 0);

  async function fecharVenda() {
    if (!cart.length || !session) { toast.error("Carrinho vazio"); return; }
    try {
      const res = await finalizar({
        data: {
          itens: cart.map((i) => ({ produto_id: i.id, quantidade: i.qtd })),
          forma: pagamento as "DINHEIRO" | "PIX" | "DEBITO" | "CREDITO" | "BOLETO" | "CORTESIA",
        },
      });
      setLog("Venda fechada • R$ " + fmtBRL(res.total) + " • " + pagamento);
      toast.success("Venda registrada com sucesso");
      setCart([]);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível finalizar a venda.");
    }
  }

  return (
    <section className="fp-view fp-glass">
      <h2>PDV de Balcão — Recepção Expressa</h2>
      <div className="fp-pdv-grid">
        <div className="fp-glass-inner">
          <h3>Catálogo</h3>
          <div className="fp-catalog-grid">
            {produtos.map((p) => (
              <div key={p.id} className="fp-prod-card" onClick={() => add(p)}>
                <h5>{p.nome}</h5>
                <p>Estoque: {p.estoque_atual}</p>
                <strong>R$ {fmtBRL(p.preco)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="fp-glass-inner">
          <h3>Carrinho</h3>
          <ul className="fp-cart">
            {cart.map((i) => (
              <li key={i.id}>
                <span>{i.qtd}× {i.nome}</span>
                <span>R$ {fmtBRL(i.preco * i.qtd)}</span>
              </li>
            ))}
          </ul>
          <p className="fp-total">Total: R$ {fmtBRL(total)}</p>
          <label className="fp-label">Meio de pagamento</label>
          <select className="fp-select" value={pagamento} onChange={(e) => setPagamento(e.target.value)}>
            <option value="DINHEIRO">Dinheiro</option>
            <option value="PIX">PIX</option>
            <option value="DEBITO">Cartão Débito</option>
            <option value="CREDITO">Cartão Crédito</option>
          </select>
          <button className="fp-btn fp-btn-primary" onClick={fecharVenda} style={{ marginTop: 14 }}>
            Fechar Venda
          </button>
          {log && <p className="fp-log">{log}</p>}
        </div>
      </div>
    </section>
  );
}
