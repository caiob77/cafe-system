import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Prisma } from '@cafe/db';

import { type ResolvedItem, calculateItemsSubtotal, canModifyOrderItems } from './helpers.js';

function item(quantity: number, addonQuantity: number, scalesWithItem: boolean): ResolvedItem {
  return {
    productId: 'p1',
    productNameSnapshot: 'Café',
    quantity,
    unitPrice: new Prisma.Decimal('5.00'),
    notes: null,
    addons: [
      {
        productAddonId: 'a1',
        addonNameSnapshot: 'Dose extra',
        quantity: addonQuantity,
        unitPrice: new Prisma.Decimal('2.00'),
        scalesWithItem,
      },
    ],
  };
}

describe('calculateItemsSubtotal', () => {
  it('multiplica o adicional pela quantidade do item', () => {
    assert.equal(calculateItemsSubtotal([item(2, 1, true)]).toFixed(2), '14.00');
    assert.equal(calculateItemsSubtotal([item(3, 2, true)]).toFixed(2), '27.00');
  });

  it('mantém a conta antiga em adicionais gravados antes da regra', () => {
    assert.equal(calculateItemsSubtotal([item(2, 1, false)]).toFixed(2), '12.00');
  });
});

describe('canModifyOrderItems', () => {
  it('permite adicionar/remover itens com pedido pendente', () => {
    assert.equal(canModifyOrderItems('pending'), true);
  });

  it('bloqueia qualquer mudanca de itens a partir de preparing', () => {
    for (const status of [
      'preparing',
      'ready',
      'out_for_delivery',
      'delivered',
      'finished',
      'cancelled',
    ] as const) {
      assert.equal(canModifyOrderItems(status), false, `status ${status}`);
    }
  });
});
