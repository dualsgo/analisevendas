'use server';
/**
 * @fileOverview Fluxo Genkit para considerações estratégicas YoY.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const YoYConsiderationsInputSchema = z.object({
  metrics: z.object({
    vendaVarPerc: z.number(),
    fluxoVarPerc: z.number(),
    paVarPerc: z.number(),
    tkmVarPerc: z.number(),
    impactoPA: z.number(),
    impactoFluxo: z.number(),
    impactoTKM: z.number(),
  }),
  context: z.string().describe('Resumo textual do que aconteceu na comparação.'),
});

export type YoYConsiderationsInput = z.infer<typeof YoYConsiderationsInputSchema>;

const YoYConsiderationsOutputSchema = z.object({
  analysis: z.string().describe('Análise estratégica dos motivos da variação.'),
  suggestion: z.string().describe('Sugestão prática para o próximo período.'),
});

export async function aiYoYConsiderations(input: YoYConsiderationsInput) {
  return aiYoYConsiderationsFlow(input);
}

const yoyConsiderationsPrompt = ai.definePrompt({
  name: 'yoyConsiderationsPrompt',
  input: { schema: YoYConsiderationsInputSchema },
  output: { schema: YoYConsiderationsOutputSchema },
  prompt: `Você é um CFO de Varejo da Ri Happy. Analise o crescimento Year over Year (Ano contra Ano) desta unidade.

INDICADORES DE VARIAÇÃO:
- Variação Venda: {{metrics.vendaVarPerc}}%
- Variação Fluxo (Cupons): {{metrics.fluxoVarPerc}}%
- Variação PA (Peças por Atendimento): {{metrics.paVarPerc}}%
- Variação Ticket Médio (TKM): {{metrics.tkmVarPerc}}%

DECOMPOSIÇÃO DE IMPACTO (R$):
- Ganho/Perda por Eficiência (PA): R$ {{metrics.impactoPA}}
- Ganho/Perda por Tráfego (Fluxo): R$ {{metrics.impactoFluxo}}
- Ganho/Perda por Valor de Ticket (TKM): R$ {{metrics.impactoTKM}}

RESUMO DO CONTEXTO:
{{{context}}}

Sua tarefa:
1. Explique por que a venda variou. Se o TKM subiu e o fluxo caiu, destaque que a equipe está "salvando" o dia com vendas maiores para menos clientes.
2. Identifique se o crescimento é "saudável" (baseado em técnica/TKM/PA) ou "perigoso" (dependente apenas de fluxo externo).
3. Dê uma diretriz clara para o gerente focar no treinamento de venda adicional ou em ações de tráfego.

Responda em formato JSON estruturado conforme o schema.`
});

const aiYoYConsiderationsFlow = ai.defineFlow(
  {
    name: 'aiYoYConsiderationsFlow',
    inputSchema: YoYConsiderationsInputSchema,
    outputSchema: YoYConsiderationsOutputSchema,
  },
  async (input) => {
    const { output } = await yoyConsiderationsPrompt(input);
    if (!output) throw new Error("Falha ao gerar considerações YoY.");
    return output;
  }
);
