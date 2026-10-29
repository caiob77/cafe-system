import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createMemberSchema,
  isMemberEmail,
  loginIdentifierToEmail,
  memberEmail,
  memberLogin,
  organizationSlugSchema,
  parseMemberEmail,
  updateMemberAccessSchema,
} from '@cafe/shared';

describe('login de membro', () => {
  it('envia usuario@slug com o domínio interno', () => {
    const email = loginIdentifierToEmail(' Joao@Cafe-Centro ');
    assert.equal(email, 'joao@cafe-centro.membros.cafe.local');
    assert.equal(isMemberEmail(email), true);
    assert.deepEqual(parseMemberEmail(email), { username: 'joao', scope: 'cafe-centro' });
  });

  it('guarda o id do café na conta, não o slug', () => {
    const email = memberEmail('joao.silva', 'Org123Abc');
    assert.equal(email, 'joao.silva@org123abc.membros.cafe.local');
    assert.deepEqual(parseMemberEmail(email), { username: 'joao.silva', scope: 'org123abc' });
    assert.equal(memberLogin('joao.silva', 'cafe-novo'), 'joao.silva@cafe-novo');
  });

  it('deixa e-mail comum como está', () => {
    assert.equal(loginIdentifierToEmail('Dono@Cafe.com'), 'dono@cafe.com');
    assert.equal(isMemberEmail('dono@cafe.com'), false);
    assert.equal(parseMemberEmail('dono@cafe.com'), null);
  });

  it('recusa e-mail interno malformado', () => {
    assert.equal(parseMemberEmail('@cafe.membros.cafe.local'), null);
    assert.equal(parseMemberEmail('joao@.membros.cafe.local'), null);
    assert.equal(parseMemberEmail('joao@a.b.membros.cafe.local'), null);
  });

  it('valida usuário, senha e papel', () => {
    const ok = createMemberSchema.safeParse({
      name: 'João',
      username: 'Joao.Silva',
      password: '12345678',
      role: 'kitchen',
    });
    assert.equal(ok.success, true);
    assert.equal(ok.success && ok.data.username, 'joao.silva');

    for (const username of ['jo', 'joao silva', 'joao@x', '.joao', 'joao..silva']) {
      const result = createMemberSchema.safeParse({
        name: 'João',
        username,
        password: '12345678',
        role: 'attendant',
      });
      assert.equal(result.success, false, `usuário ${username}`);
    }

    const owner = createMemberSchema.safeParse({
      name: 'João',
      username: 'joao',
      password: '12345678',
      role: 'owner',
    });
    assert.equal(owner.success, false);
  });

  it('valida edição de acesso', () => {
    const both = updateMemberAccessSchema.safeParse({ username: 'Joao', password: '12345678' });
    assert.equal(both.success && both.data.username, 'joao');
    assert.equal(updateMemberAccessSchema.safeParse({ password: '12345678' }).success, true);
    assert.equal(updateMemberAccessSchema.safeParse({ username: 'joao' }).success, true);
    assert.equal(updateMemberAccessSchema.safeParse({}).success, false);
    assert.equal(updateMemberAccessSchema.safeParse({ password: '123' }).success, false);
    assert.equal(updateMemberAccessSchema.safeParse({ username: 'jo ao' }).success, false);
  });

  it('valida slug do café', () => {
    const ok = organizationSlugSchema.safeParse(' Cafe-Novo ');
    assert.equal(ok.success && ok.data, 'cafe-novo');
    for (const slug of ['ab', 'cafe.novo', 'cafe novo', '-cafe', 'cafe--novo', 'café']) {
      assert.equal(organizationSlugSchema.safeParse(slug).success, false, `slug ${slug}`);
    }
  });
});
