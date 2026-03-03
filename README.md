# Ri Happy | Analisador de Performance Estratégica

Este é um ecossistema avançado de análise de dados fiscais (XML/NFC-e) focado na operação de varejo da Ri Happy. O sistema utiliza inteligência artificial e algoritmos de auditoria para transformar notas fiscais brutas em decisões estratégicas.

## 🚀 Painéis de Análise e Funcionalidades Rápidas

Abaixo estão detalhados os 29 painéis estratégicos agrupados por categoria, que compõem este ecossistema de análise:

### 🧠 Inteligência Artificial
- **Insights IA (Genkit/Gemini)**: Diagnóstico executivo e automático sobre a saúde geral da unidade e fechamento.
- **Chat Estratégico**: Copiloto interativo para consultas em tempo real e em linguagem natural sobre os dados carregados.

### � Visão Geral & Consolidada
- **Visão Geral**: Dashboard principal interativo com filtros independentes para lojas físicas, pickup, vendas adicionais e trocas.
- **Relatório Consolidado**: Visão macro com todos os dados financeiros unificados por colaborador (Vendas, KPIs, Peças, Taxa de Conversão).
- **Performance Diária**: Visão sazonal e linha do tempo de faturamento, com filtros por dia da semana e dias no mês.
- **Resultado YoY (Year-over-Year)**: Analisa o crescimento e variação de indicadores e faturamento frente ao mesmo período do ano anterior.

### 🏃 Dinâmica & Comportamento de Vendas
- **Ritmo Operacional**: Análise de fluxo das vendas, detectando ociosidade, tempo entre vendas e gargalos operacionais no PDV.
- **Mapa de Calor**: Visão gráfica das faixas de horário e dias da semana com maior concentração de faturamento ou movimento.
- **Curva de Energia**: Estudo detalhado sobre o impulso de vendas e como ele se comporta ao longo do horário comercial.
- **Anatomia da Cesta**: Quebra do perfil das compras do consumidor, focando em tamanho de cesta e frequência dos valores movimentados.
- **Composição**: Diagnóstico para entender o peso real dos descontos e contribuição de faturamento de diferentes modalidades.
- **Formas de Pagamento**: Radar de concentração das vendas segmentado pelo meio de pagamento utilizado.
- **Perfil de Preço**: Gráficos mostrando a distribuição dos preços praticados com ou sem aplicação de descontos na venda final.
- **Fluxo & Pareto (Deep Dive)**: Uma imersão profunda na regra 80/20. Categoria dos grandes impulsionadores que representam o maior faturamento.

### 🏆 Rankings & Performance Individual
- **Performance Colaboradores**: Quadro geral listando vendas, KPIs, trocas e comparativos frente à média global da loja.
- **Arena de Talentos**: Painel gamificado do time, balanceando quem é forte no ticket médio, volume bruto ou baixa dependência de descontos.
- **Ranking de Itens**: Listagem dos SKUs e produtos de maior saída (curva ABC) dentro da amostragem submetida ao sistema.
- **Produtividade Operacional**: Avaliação de tempo e eficiência técnica de cada operador de caixa (velocidade e cadência).

### 🚀 Oportunidades & Upsell
- **SLP & Social (Venda Sugestiva)**: Observa oportunidades ganhas, como cross-selling efetivo de itens pequenos na boca do caixa.
- **Oportunidades Perdidas**: Identificação sistemática de cupons ou tickets isolados de alto valor final contendo um único item vendido.

### �️ Auditoria, Risco & Compliance
- **Radar de Alertas**: Sinalizações automáticas para quebras de compliance como alto índice de devoluções, fugitivos ou CPFs pulverizados.
- **Risco Comercial**: Analisa cenários anormais, com descontos excessivos ou tickets subvalorizados na amostragem geral.
- **Auditoria PA**: Detecção de manipulação técnica na medição de Peças por Atendimento, visando o ganho de bonificações com itens de R$0.01.
- **Audit. Conversão**: Rastreabilidade do volume omni e pick-up online convertidos efetivamente em novas compras incrementais de balcão.
- **Audit. Descontos**: Auditoria isolada de descontos autorizados (10% de aniversário/adicional) comparando com descontos genéricos de margem.
- **Audit. Trocas**: Diagnóstico comparando upsell em devoluções versus trocas passivas.
- **Qualidade de Venda**: Intersecção entre ticket médio global forte frente a um alto índice de notas identificadas.
- **Elasticidade Desconto**: Mensuração quantitativa se campanhas de desconto geraram aumento expressivo de volume.
- **Fidelidade & Recorrência**: Avalia o volume de CPFs repetidos na carteira de clientes retornando à unidade.

### 🛠️ Ferramentas Operacionais de PDV
- **Gerador de Cartazes**: Precificação exata para emissão física (Aéreo, Relíquias) na cor e proporção gráfica para prateleira.
- **Transações & 2ª Via**: Consulta estruturada para emitir réplicas em 80mm e espelho do cupom da operação.
- **WhatsApp**: Preparador de relatórios visuais textuais e rankings formatados prontos para repasse aos grupos.

## 🛠️ Tecnologias
- NextJS (App Router)
- Tailwind CSS & Shadcn UI
- Recharts (Gráficos e visualização de dados)
- Genkit AI (Google Gemini)
- JSZip (Processamento de pacotes XML)
