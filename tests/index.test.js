import * as indexFn from '../src/index.js';

describe('Funzioni di Utilità e Matematica', () => {
    test('clamp deve limitare i valori entro il range', () => {
        expect(indexFn.clamp(5, 0, 10)).toBe(5);
        expect(indexFn.clamp(-1, 0, 10)).toBe(0);
        expect(indexFn.clamp(15, 0, 10)).toBe(10);
    });
});
