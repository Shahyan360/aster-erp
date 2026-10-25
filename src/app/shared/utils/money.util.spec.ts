import { grossUpTax, sumMoney, moneyDifference } from './money.util';
describe('monetary operations', () => {
    it('adds decimal currency values without binary drift', () => expect(sumMoney([0.1, 0.2])).toBe(0.3));
    it('subtracts decimal amounts exactly', () => expect(moneyDifference(0.3, 0.1)).toBe(0.2));
    it('preserves the existing withholding gross-up model', () => expect(grossUpTax(950, 5)).toBe(50));
    it('does not gross up zero or invalid percentage boundaries', () => {
        expect(grossUpTax(100, 0)).toBe(0);
        expect(grossUpTax(100, 100)).toBe(0);
    });
    it('keeps the existing additive discount convention', () => expect(sumMoney([950, 20, grossUpTax(950, 5)])).toBe(1020));
});
