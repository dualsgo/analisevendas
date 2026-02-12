
export interface DetailedSaleRow {
  chave: string;
  nf: string;
  dhEmi: string;
  vendedor: string;
  canal: string;
  vNF: string;
  itens_qtd: string;
  is_troca: boolean;
  vTroca: string;
  dif_troca: string;
  is_retirada: boolean;
  is_retirada_adicional: boolean;
  pickup_match_fields: number;
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
