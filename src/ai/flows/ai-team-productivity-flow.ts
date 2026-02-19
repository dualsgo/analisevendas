'use server';
/**
 * @fileOverview Fluxo Genkit para análise profunda de produtividade de equipe e colaboradores.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProductivityInputSchema = z.object({
  vendorSummary: z.array(z.any()).describe('Lista de métricas por vendedor.'),
  storeMetrics: z.any().describe('Resumo consolidado da loja.'),
});

export type ProductivityInput = z.infer<typeof ProductivityInputSchema>;

const ProductivityOutputSchema = z.object({
  globalAnalysis: z.string().describe('Análise geral do clima e produtividade da equipe.'),
  individualHighlights: z.array(z.object({
    name: z.string(),
    analysis: z.string().describe('Análise qualitativa do desempenho deste colaborador.'),
    score: z.number().describe('Score de produtividade de 0 a 100.'),
    priorityAction: z.string().describe('Ação prática sugerida para este colaborador.')
  })),
});

export type ProductivityOutput = z.infer<typeof ProductivityOutputSchema>;

export async function aiTeamProductivity(input: ProductivityInput) {
  return aiTeamProductivityFlow(input);
}

const productivityPrompt = ai.definePrompt({
  name: 'productivityPrompt',
  input: { schema: ProductivityInputSchema },
  output: { schema: ProductivityOutputSchema },
  prompt: `Você é um Consultor Master de RH e Operações da Ri Happy. 
Sua missão é analisar a produtividade da equipe com foco em eficiência, argumento de venda e fidelização.

CONTEXTO DA LOJA:
- PA Global: {{storeMetrics.pa}}
- TKM Global: R$ {{storeMetrics.tkm}}
- Identificação (CPF): {{storeMetrics.cadastros}}%

DADOS POR VENDEDOR:
{{#each vendorSummary}}
- {{name}}: Venda R$ {{venda}}, PA {{pa}}, TKM R$ {{tkm}}, Fidelização {{taxaIdentificacao}}%, Conversão Pickup {{taxaConversaoOnline}}%
{{/each}}

DIRETRIZES:
1. Seja motivador, mas extremamente técnico e direto.
2. Identifique os "Campeões de Adicional" (quem tem maior conversão pickup).
3. Identifique quem está "perdendo margem" ou com PA baixo e dê uma dica de treinamento.
4. Avalie se a equipe está focada em identificar clientes (CPF).
5. Responda em formato JSON estruturado.`
});

const aiTeamProductivityFlow = ai.defineFlow(
  {
    name: 'aiTeamProductivityFlow',
    inputSchema: ProductivityInputSchema,
    outputSchema: ProductivityOutputSchema,
  },
  async (input) => {
    const { output } = await productivityPrompt(input);
    if (!output) throw new Error("Falha ao gerar análise de produtividade.");
    return output;
  }
);
