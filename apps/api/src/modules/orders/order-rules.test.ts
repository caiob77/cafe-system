import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canModifyOrderItems } from './helpers.js';

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
