# Analisador de Performance Estratégica | Varejo Inteligente

Este é um ecossistema avançado de análise de dados fiscais (XML/NFC-e e SAT) focado inteiramente na operação de varejo. Diferente de sistemas de BI tradicionais que apenas exibem gráficos descritivos (o *que* aconteceu), esta plataforma utiliza algoritmos estruturais e diagnósticos cruzados para apontar a causa-raiz (o *porquê* aconteceu e *onde* está a oportunidade de ganho).

## 🎯 A Proposta

O **Analisador de Performance Estratégica** foi concebido sob três pilares principais:

1. **Privacidade por Design (Zero-Cloud)**: A inovação central da aplicação é a leitura e processamento massivo de arquivos fiscais XML localmente no navegador do usuário. **Nenhum dado é enviado para nuvem ou servidores externos**, garantindo absoluto sigilo comercial e compliance com a LGPD. Todo o cálculo estatístico acontece na memória da máquina local (In-Browser Processing).
2. **Diagnóstico Ativo**: Ao invés de apenas mostrar "O Faturamento caiu 10%", o sistema decompõe essa queda nas três alavancas do varejo: Fluxo (Atendimentos), Profundidade (Peças por Atendimento) e Valor (Ticket Médio), sugerindo planos de ação.
3. **Visão Omnicanal e Operacional**: Integra análises de canais físicos e digitais (Pickup, Delivery, Prateleira Infinita), monitorando o impacto do e-commerce no piso de loja.

---

## 💻 Arquitetura e Stack Tecnológica

O sistema emprega uma arquitetura robusta de frontend desenvolvida para lidar com parsing complexo e alta performance:

- **Framework Core**: React 19 com Next.js 15 (App Router).
- **Tipagem Estrita**: TypeScript.
- **Processamento de Dados**: `DOMParser` nativo, em conjunto com algoritmos de agrupamento em memória para lidar com centenas de arquivos XML simultaneamente, extraindo nós do padrão NFe/NFCe.
- **Estilização e UI**: Tailwind CSS integrado à biblioteca `shadcn/ui` para componentes acessíveis e modulares.
- **Visualização de Dados**: `Recharts` para plotagem gráfica de alto desempenho.
- **Animações Cinéticas**: `Framer Motion` para transições de painéis, micro-interações dinâmicas e layouts fluidos, entregando experiência Premium.
- **Tratamento Temporal**: `date-fns` para cronologia diagnóstica avançada (fusos horários e mapeamento de jornadas).

---

## 🧩 Os Painéis e Análises Propostas

A plataforma é dividida em módulos analíticos extremamente especializados. Abaixo estão detalhados os principais painéis que compõem o ecossistema:

### 🧠 Diagnóstico & Produtividade
- **GAP de Produtividade**: Identifica a causa-raiz da perda de faturamento (R$), decompondo a diferença nas três verticais puras: Volume, Profundidade (PA) e Valor (Ticket). Possui um simulador de cenários.
- **Arena de Talentos**: Avaliação profunda do desempenho individual dos vendedores, classificando-os de acordo com TM, PA, conversão e peso no faturamento da loja.
- **Projeção de Impacto**: Analisa as tendências diárias e projeta o fechamento com base na performance atual da equipe.

### 📊 Visões Consolidadas & Tempo
- **Resumo Executivo & Visão Geral**: Dashboard consolidado focado em métricas-chave (Big Numbers), oferecendo relatórios transacionais rápidos.
- **Performance Semanal e Diária**: Análise detalhada da variação de faturamento ao longo da semana, avaliando picos de tráfego e dias de vale.
- **Análise de Domingos e Feriados**: Avaliação focada em dias estratégicos de alto custo operacional, justificando o funcionamento da loja perante sua capacidade de atração e retorno sobre investimento de pessoal.

### 🏃 Dinâmica Operacional & Comportamento
- **Ritmo Operacional & Mapa de Calor**: Mapeia o fluxo de vendas no relógio (janelas de horário). Identifica gargalos no balcão e picos de demanda.
- **Conciliação de Caixa (Fechamento)**: Automação para fechamento de caixa cego, confrontando formas de pagamento lançadas versus registradas.
- **Comportamento de Cesta & Composição**: Analisa o mix financeiro, revelando se a loja depende de poucos tickets altos ou muitos tickets baixos.

### 🏆 Produtos, Ticket & Campanhas
- **Matriz de Afinidade (Cross-Sell)**: Algoritmo de recomendação natural que mapeia "produtos que saem juntos" no mesmo cupom, potencializando vendas adicionais.
- **Ofertas Imperdíveis & Ação Social**: Monitora o impacto das campanhas e itens promocionais anexados no checkout de forma rápida (venda sugestiva e SLP).
- **Elasticidade de Desconto**: Mensura se o sacrifício de margem (descontos aplicados) gerou real incremento volumétrico.
- **Ranking de Produtos por Vendedor**: Expõe quais vendedores têm mais tração na venda de itens curva A, cruzando eficiência do portfólio.

### 🛡️ Auditoria, Risco & Compliance
- **Radar de Alertas**: Sinalizações automáticas (score de risco) para transações atípicas e desvios de processo.
- **Análise de Cupons Consecutivos**: Identifica possíveis quebras e fragmentações de venda pelo caixa para burlar métricas de atendimento.
- **Auditoria de PA (Peças por Atendimento)**: Localiza vendas artificialmente infladas para proteger a autenticidade do indicador de produtividade.
- **Risco de Trocas & Devoluções**: Avaliação do fluxo de reentradas, protegendo a sangria do caixa e evitando fraudes de estorno.

### 📍 Omnicanalidade, Clientes & Canais
- **Monitor Pickup & Delivery**: Painéis voltados a mensurar a força das vendas originadas no site e faturadas na loja (Clique e Retire).
- **Fidelidade & Recorrência**: Análise baseada em identificação de clientes recorrentes, mensurando o Lifetime Value dentro do mês.
- **Oportunidades Perdidas**: Detecta tickets isolados que escaparam do caixa com um único item, apontando falhas diretas de abordagem e oferta de complementos.
- **Relatórios via WhatsApp**: Exportação formatada para disparo direto das metas e GAPs diários via mobile.

---

## 🚀 Como Iniciar

1. Clone o repositório ou navegue até o diretório do projeto.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Acesse `http://localhost:9002` no navegador.
5. Na plataforma, arraste seus arquivos XML/NFC-e na *Upload Zone* para processamento imediato (offline mode supported).
