import Decimal from 'decimal.js';

// Decimal operations retain the existing financial formulas; conversion to the
// API's numeric DTO happens only at the boundary. The server remains authoritative.
export const sumMoney = (values: readonly number[]): number => values.reduce((total, value) => total.plus(value), new Decimal(0)).toNumber();

export function grossUpTax(net: number, percent: number): number {
    if (percent <= 0 || percent >= 100) return 0;
    return new Decimal(net)
        .div(new Decimal(1).minus(new Decimal(percent).div(100)))
        .minus(net)
        .toNumber();
}

export const moneyDifference = (left: number, right: number): number => new Decimal(left).minus(right).toNumber();
