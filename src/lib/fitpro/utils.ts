export const fmtBRL = (n: number | string | null | undefined) =>
  Number(n || 0).toFixed(2).replace(".", ",");

export const TENANT_TABLES = [
  "alunos",
  "produtos",
  "vendas",
  "recorrencias",
  "treinos",
  "historico_cargas_treino",
  "avaliacoes",
  "aulas",
] as const;

export type PollockInput = {
  sexo: "M" | "F";
  idade: number;
  peso: number;
  altura: number;
  peitoral: number;
  abdominal: number;
  coxa: number;
};

export function calcularPollock3(d: PollockInput) {
  const sum = d.peitoral + d.abdominal + d.coxa;
  const densidade =
    d.sexo === "M"
      ? 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * d.idade
      : 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * d.idade;
  const percentual_gordura = ((4.95 / densidade) - 4.5) * 100;
  const massa_gorda = d.peso * (percentual_gordura / 100);
  const massa_magra = d.peso - massa_gorda;
  const imc = d.peso / Math.pow(d.altura / 100, 2);
  return {
    densidade_corporal: Number(densidade.toFixed(4)),
    percentual_gordura: Number(percentual_gordura.toFixed(2)),
    massa_gorda: Number(massa_gorda.toFixed(2)),
    massa_magra: Number(massa_magra.toFixed(2)),
    imc: Number(imc.toFixed(2)),
  };
}

export function capturarTemplateDigital() {
  const bytes = new Uint8Array(64);
  for (let i = 0; i < 64; i++) bytes[i] = Math.floor(Math.random() * 256);
  return "BIO-DIG::" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function processarSelfieFacial() {
  const v: number[] = [];
  for (let i = 0; i < 128; i++) v.push(Math.random() * 2 - 1);
  return v;
}

export function validarAcessoCatraca(aluno: {
  status_financeiro?: string | null;
  hash_biometria_digital?: string | null;
  vetor_facial?: string | null;
} | null) {
  if (!aluno)
    return { permitido: false, codigo: "ERR_404", mensagem: "Aluno não localizado" };
  if (aluno.status_financeiro === "INADIMPLENTE")
    return {
      permitido: false,
      codigo: "BLOQ_FIN_402",
      mensagem: "Acesso negado: aluno inadimplente — solenoide travado",
    };
  if (!aluno.hash_biometria_digital && !aluno.vetor_facial)
    return {
      permitido: false,
      codigo: "ERR_BIO_MISS",
      mensagem: "Sem biometria cadastrada",
    };
  return {
    permitido: true,
    codigo: "OK_200",
    mensagem: "Acesso liberado — destravando catraca",
  };
}
