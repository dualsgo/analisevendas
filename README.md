# 📊 XML Sales Analyzer (`analisevendas`) — Suíte Avançada de Inteligência Comercial

Aplicação web construída em **Next.js 15 + React 19 + TypeScript** para auditoria, processamento e análise estratégica de vendas de varejo a partir de lotes de **arquivos XML fiscais (NF-e / NFC-e compactados em `.zip`)** e escalas de equipe.

---

## 🚀 Principais Funcionalidades

### 1. 📥 Processamento Local de XMLs (`xml-parser.ts` & `useSalesProcessor.ts`)
- Leitura instantânea de arquivos `.zip` contendo milhares de XMLs de cupons fiscais diretamente no navegador com persistência em **IndexedDB** (`indexed-db.ts`).
- Classificação automática de canais: **Loja Física**, **Retirada Online (Pickup)**, **Delivery / Express** e **Trocas**.

### 2. 📈 Painéis Executivos e Auditoria Comercial (`src/components/`)
- **Resumo Executivo e Relatório Consolidado** (`ExecutiveSummary.tsx`, `ConsolidatedReport.tsx`, `SalesSummary.tsx`, `DailyPerformance.tsx`, `WeeklyAnalysis.tsx`).
- **Qualidade de Cesta e P.A.** (`BasketQualityAnalysis.tsx`, `MacroBasketSplitAnalysis.tsx`, `AdditionalItemsAnalysis.tsx`, `UnmissableOffersAnalysis.tsx`, `AgingCampaignAnalysis.tsx`).
- **Raio-X de Colaboradores** (`CollaboratorXRay.tsx`, `CollaboratorHeadToHead.tsx`, `CollaboratorTeamDispersion.tsx`, `CollaboratorProductRanking.tsx`, `WeightedPerformanceReport.tsx`).
- **Cruzamento com Escala e Turnos** (`ShiftPerformance.tsx`, `ShiftComparisonSelector.tsx`, `escalaProcessor.ts`).
- **Ritmo Operacional e Mapa de Calor** (`OperationalRhythm.tsx`, `HeatmapAnalysis.tsx`, `TemporalComparisonSuite.tsx`).
- **Auditoria de Caixa, Descontos e Cupons** (`CashReconciliation.tsx`, `DiscountAudit.tsx`, `ConsecutiveCouponAnalysis.tsx`, `ConversionAudit.tsx`, `ExchangeManagement.tsx`, `PaymentMap.tsx`).
- **Omnichannel & Engajamento** (`PickupDashboard.tsx`, `PickupPanel.tsx`, `DeliveryPanel.tsx`, `CustomerLoyalty.tsx`, `SocialActionPanel.tsx`, `CopaAnalysis.tsx`).
- **Relatórios para WhatsApp & Simulador** (`WhatsappReports.tsx`, `SimuladorCenarios.tsx`, `RealtimeImpactPanel.tsx`, `ThermalReceipt.tsx`).

---

## 🛠️ Stack Tecnológica

- **Framework**: Next.js 15 (Turbopack), React 19, TypeScript 5
- **UI & Design**: Tailwind CSS, Radix UI / shadcn/ui, Framer Motion, Lucide React
- **Gráficos & Exportação**: Recharts, `html2canvas`, `jszip`, exportador CSV

---

## 📂 Estrutura do Projeto

```text
analisevendas/
├── docs/
│   └── blueprint.md            # Especificação original do projeto
├── scripts/                    # Utilitários de transformação e testes de parser
├── src/
│   ├── app/                    # Rotas Next.js App Router (Dashboard principal e visão Looker)
│   ├── components/             # +45 módulos analíticos especializados + componentes UI
│   ├── data/                   # Dados estáticos de referência de campanhas
│   ├── hooks/                  # Hooks de processamento (useSalesProcessor)
│   └── lib/                    # Parser XML, motor de qualidade de cesta, turnos e IndexedDB
└── package.json
```

---

## 💻 Como Executar

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (porta 9002)
npm run dev

# Checar tipagem e gerar build de produção
npm run typecheck
npm run build
```

---

## 🔒 Privacidade e Segurança
Os arquivos `.zip`/`.xml` e planilhas de vendas são processados localmente no navegador do usuário via IndexedDB. Planilhas brutas de treinamento (`.xlsx`/`.csv`) não são mantidas no repositório.
