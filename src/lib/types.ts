
export interface Item {
  cProd: string;
  xProd: string;
  qCom: number;
  vProd: number;
  vDesc: number;
}

export interface DetailedSaleRow {
  // Identificação
  chave: string;
  nf: string;
  serie: string;
  modelo: string;
  dhEmi: string;
  vendedor: string;
  
  // Tipo
  tpNF: number; // 0=entrada, 1=saída
  finNFe: number;
  natOp: string;
  
  // Classificação
  canal: string;
  subcanal: string;
  canal_consolidado: string;
  
  // Status Adicional
  is_adicional: boolean;
  is_adicional_suspeito: boolean;
  motivo_adicional: string;
  tipo_retirada_associada?: "ANTES" | "DEPOIS";
  chave_retirada_associada?: string;
  data_retirada_associada?: string;
  
  // Valores
  vNF: string;
  itens_qtd: string;
  desconto_total: string;
  percentual_desconto: string;
  
  // Troca
  is_troca: boolean;
  vTroca: string;
  dif_troca: string;
  is_devolucao: boolean;
  refNFe: string[];
  refNFe_normalizadas: string[];
  chave_troca_vinculada?: string;
  chave_devolucao_vinculada?: string;

  // Retirada e Pagamento
  is_retirada_online: boolean;
  vTroco: string;
  is_presencial_por_troco: boolean;
  tpIntegra: string;
  
  // Auditoria
  tem_desconto: boolean;
  tipo_desconto: string;
  status_auditoria: string;
  
  // CEP e Endereço
  cep_dest: string;
  cep_loja: string;
  is_cep_diferente_da_loja: boolean;
  is_endereco_real: boolean;
  
  // Cliente
  cpf_cnpj_dest: string;
  nome_dest: string;
  endereco_dest: string;
  tem_destinatario: boolean;
}

export interface ChannelSummaryRow {
  Canal: string;
  Cupons: string;
  Venda_Total: string;
  Itens_Total: string;
  TKM: string;
  PA: string;
}

export interface VendorSummaryRow {
  Canal: string;
  Vendedor: string;
  Cupons: string;
  Venda_Total: string;
  Itens_Total: string;
  TKM: string;
  PA: string;
}

export interface VinculoTroca {
  chave_entrada: string;
  chave_saida: string;
  cpf_cliente: string;
  nome_cliente: string;
  vendedor: string;
  data_entrada: string;
  data_saida: string;
  itens_devolvidos: number;
  itens_trocados: number;
  diferenca_itens: number;
  valor_devolvido: number;
  valor_trocado: number;
  valor_credito: number;
  valor_diferenca: number;
  metodo_vinculo: string;
  confianca: number;
}
