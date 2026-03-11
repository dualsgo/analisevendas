'use server';
/**
 * @fileOverview Fluxo Genkit para análise profunda de produtividade com consciência de contexto.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProductivityInputSchema = z.object({
  vendorSummary: z.array(z.any()).describe('Lista de métricas por vendedor.'),
  storeMetrics: z.any().describe('Resumo consolidado da loja.'),
  pageContext: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
  specificData: z.any().optional().describe('Dados específicos do painel atual (ex: alertas de PA, trocas, etc).')
});

export type ProductivityInput = z.infer<typeof ProductivityInputSchema>;

const ProductivityOutputSchema = z.object({
  specialistRole: z.string().describe('O papel que a IA assumiu para esta análise (ex: Auditor, CFO, Gerente de CRM).'),
  globalAnalysis: z.string().describe('Análise geral focada no tema da página atual.'),
  individualHighlights: z.array(z.object({
    name: z.string(),
    analysis: z.string().describe('Análise qualitativa focada no tema da página.'),
    score: z.number().describe('Score de 0 a 100 baseado no tema específico.'),
    priorityAction: z.string().describe('Ação prática sugerida para o tema atual.')
  })),
});

export type ProductivityOutput = z.infer<typeof ProductivityOutputSchema>;

export async function aiTeamProductivity(input: ProductivityInput) {
  return aiTeamProductivityFlow(input);
}

const aiTeamProductivityFlow = ai.defineFlow(
  {
    name: 'aiTeamProductivityFlow',
    inputSchema: ProductivityInputSchema,
    outputSchema: ProductivityOutputSchema,
  },
  async (input) => {
    const { vendorSummary, storeMetrics, pageContext, specificData } = input;

    const systemPrompt = `Você é um Consultor Master de Varejo da Ri Happy, assumindo o papel de ESPECIALISTA EM ${pageContext?.name || 'GESTÃO GERAL'}.

SUA MISSÃO:
Analisar os dados fornecidos com foco EXCLUSIVO no tema da página atual: "${pageContext?.name}".
Você deve dar insights profundos, pontos de vista técnicos e orientar o gerente sobre como melhorar os indicadores DESTA PÁGINA específica.

TEMAS DE REFERÊNCIA:
- Se for Auditoria PA: Foque em manipulação de indicadores (itens 0,01) e integridade.
- Se for Conversão Pickup: Foque em transformar retiradas em vendas incrementais (Upsell).
- Se for Trocas: Foque em ganhar PA e valor na troca.
- Se for Elasticidade: Foque no uso viciado de descontos.

DADOS CONSOLIDADOS:
- PA Global: ${storeMetrics.pa}
- TKM Global: R$ ${storeMetrics.tkm}
- Fidelização: ${storeMetrics.cadastros}%

DADOS POR VENDEDOR:
${JSON.stringify(vendorSummary)}

DADOS ESPECÍFICOS DO PAINEL (${pageContext?.name}):
${JSON.stringify(specificData)}

DIRETRIZES:
1. Seja técnico, direto e adote a postura do especialista do tema.
2. Identifique quem são os campeões e quem são os riscos NO TEMA DA PÁGINA.
3. Se houver dados de "Auditoria", aponte comportamentos suspeitos nominalmente.
4. Se houver dados de "Conversão", sugere treinamentos de abordagem.
5. Responda em JSON conforme o schema.`;

    const { output } = await ai.generate({
      prompt: systemPrompt,
      output: { schema: ProductivityOutputSchema }
    });

    if (!output) throw new Error("Falha ao gerar consultoria contextual.");
    return output;
  }
);
