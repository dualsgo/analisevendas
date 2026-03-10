import { ai } from './genkit';

export const dev = ai.defineFlow({ name: 'dev' }, async () => {
    return 'Genkit Dev Mode Active';
});
