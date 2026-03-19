# Ri Happy | Analisador de Performance Estratégica

Este é um ecossistema avançado de análise de dados fiscais (XML/NFC-e) focado na operação de varejo. O sistema utiliza algoritmos estruturais e diagnósticos cruzados para transformar notas fiscais brutas em decisões estratégicas, fugindo de painéis descritivos e focando diretamente na causa-raiz do resultado com alta tecnologia front-end.

## 🚀 Painéis de Análise e Funcionalidades Rápidas

Abaixo estão detalhados os principais painéis estratégicos agrupados por categoria, que compõem este ecossistema de análise de dados hoje (Atualizado):

### 🧠 Diagnóstico & Produtividade
- **GAP de Produtividade (Novo)**: Menu especializado em entender a razão do resultado apontando o GAP de Faturamento (R$) decomposto nas 3 verticais puras de operação: Volume (Fluxo), Profundidade (PA) e Valor (Ticket). Conta com simulador de cenários, removedor de distorção de canais digitais e diagnóstico textual automatizado da causa-raiz contendo plano de ação.
- **Projeção de Impacto**: Avalia tendências e prevê impactos baseados na performance técnica das sessões ativas.

### 📊 Visão Geral & Consolidada
- **Visão Geral**: Dashboard principal interativo com filtros independentes de comportamento para lojas físicas, pickup, vendas adicionais, delivery e painel de trocas com TKM e P.A customizados.
- **Resumo Executivo**: Consolidado paramétrico focado nos indicadores chave (Big Numbers) consolidados da unidade.
- **Performance Geral**: Visão macro consolidada de toda a operação divididos no formato de relatórios transacionais.
- **Performance Diária**: Visão da linha do tempo de faturamento e cupons, exibindo métricas diárias essenciais.

### 🏃 Dinâmica & Comportamento de Vendas
- **Ritmo Operacional**: Análise do fluxo estrito de vendas, mapeando janelas de oportunidade em relógio e detectando gargalos.
- **Mapa de Calor**: Visão gráfica matricial de faixas de horário com maior concentração volumétrica de faturamento.
- **Formas de Pagamento**: Diagnóstico de participação de dinheiro, cartões físicos e meios não-físicos na apuração total.
- **Perfil de Preço**: Gráficos estatísticos mostrando a distribuição dos preços isolados do mix praticado no pacote de notas selecionado.

### 🏆 Produtos & Ticket
- **Matriz de Afinidade**: Ferramenta de Cross-Selling natural. Observa correlações de compra que dizem quais produtos frequentemente saem unidos em um mesmo cupom.
- **Ranking de Itens**: Listagem de tração dos SKUs mais fortes por canal dentro da amostragem em avaliação.
- **SLP & Social (Venda Sugestiva)**: Validador de performance focada em conversão rápida, destacando o giro de itens complementares e miudezas anexadas às notas no momento do fechamento da compra.
- **Elasticidade Desconto**: Relata se as concessões de preços efetuadas provocaram esticões nos volumes de aquisição orgânica.

### 🛡️ Auditoria, Risco & Compliance
- **Radar de Alertas**: Sinalizações quantitativas automáticas para comportamentos estranhos em transações ou anomalias.
- **Análise de Cupons**: Inspeção vertical para detectar cupons com traços de vulnerabilidade, quebra de procedimentos e manipulação de pontuação de CPF.
- **Auditoria PA**: Identificador lógico que mapeia transações que sofrem adição artificial de itens para manipular a métrica de desempenho de balcão (Peças por Atendimento).
- **Audit. Conversão**: Rastreabilidade do volume omnichannel (como ordens de pick-up digital) que obteve êxito para conversão com compras incrementais registradas em PDV.
- **Audit. Descontos**: Auditoria do peso financeiro dos descontos (promocionais e sistêmicos) e como estes afetam o desempenho marginal.
- **Trocas & Risco de Trocas**: Trata estritamente a reversão de sangria no fluxo de devolução e sinaliza os riscos diretos inerentes à essas reentradas em sistema.
- **Qualidade de Venda**: Cruzamento avançado focado na fidelização vs TKM do caixa atendido.

### 📍 Clientes & Canais
- **Monitor Pickup**: Segmentação avançada e métricas nativas gerenciais exclusivas para as vendas do projeto Retire na Loja / Click & Collect.
- **Monitor Delivery**: Acompanhamento exclusivo das notas vinculadas ao transporte de delivery.
- **Fidelidade & Recorrência**: Varredura baseada na identificação fiscal que avalia a concentração de CPFs retornando no banco de dados.
- **Análise Geográfica**: Mapeamento espacial baseado nos códigos postais e distâncias identificadas na extração dos dados destas guias e notas NFC-e.

### 🛠️ Ferramentas Operacionais de PDV
- **Oportunidades Perdidas**: Identificação sistemática dos tickets isolados de médio/alto valor que escorreram com um único item, detectando dinheiro na mesa pela falta de abordagem em caixa.
- **Transações & 2ª Via**: Consulta limpa, unificada e altamente filtrável para inspecionar linha a linha ou recuperar tickets originais de notas analisadas.
- **WhatsApp**: Ferramenta prática projetada para produzir resultados resumidos da seção em formato de clipboard amigável para celulares, visando report ágil.

## 🛠️ Stack Tecnológica

O sistema emprega arquitetura estrita de frontend visando máxima segurança e sigilo de dados (data processing occurs in-browser):
- NextJS 14 (App Router)
- React 18 & TypeScript Nativo
- Tailwind CSS & ui/Shadcn & Framer Motion (Transições e animações cinemáticas avançadas fluidas)
- Lucide React (Ícones Vetoriais)
- DOMParser Nativo (Análise computacional e serialização de arquivos legados de XML/NFe sem envio a nuvem)
- Date-Fns (Tratamento cronológico agnóstico)
