import { describe, expect, it } from 'vitest';

import {
  Account,
  type AccountID,
  AccountNameSchema,
  type CreateAccountArgs,
} from './account.js';

const exampleInput: CreateAccountArgs = {
  id: '1' as AccountID,
  bio: 'this is john doe’s account!',
  createdAt: new Date('2023-09-10T00:00:00.000Z'),
  mail: 'test@mail.example.com',
  nickname: 'John Doe',
  passphraseHash: 'leknflkwnrigohidvlk',
  role: 'admin',
  status: 'active',
  frozen: 'frozen',
  silenced: 'silenced',
  name: '@johndoe@social.example.com',
  updatedAt: new Date('2023-09-10T09:00:00.000Z'),
  deletedAt: new Date('2023-09-10T10:00:00.000Z'),
};

describe('Account', () => {
  it('generate new instance', () => {
    const account = Account.new(exampleInput);

    expect(account.getID()).toBe(exampleInput.id);
    expect(account.getName()).toBe(exampleInput.name);
    expect(account.getMail()).toBe(exampleInput.mail);
    expect(account.getNickname()).toBe(exampleInput.nickname);
    expect(account.getPassphraseHash()).toBe(exampleInput.passphraseHash);
    expect(account.getBio()).toBe(exampleInput.bio);
    expect(account.getRole()).toBe(exampleInput.role);
    expect(account.getStatus()).toBe('notActivated');
    expect(account.getCreatedAt()).toBe(exampleInput.createdAt);
    expect(account.getUpdatedAt()).toBe(undefined);
    expect(account.getDeletedAt()).toBe(undefined);
  });

  it('account nickname must be less than 256', () => {
    const name = 'a'.repeat(257);
    const account = Account.new(exampleInput);
    expect(() => account.setNickName(name)).toThrow();
  });

  it('account bio must be less than 1024 chars', () => {
    const bio = 'a'.repeat(1025);
    const account = Account.new(exampleInput);
    expect(() => {
      account.setBio(bio);
    }).toThrow();
  });

  it('can’t change values when account is frozen', () => {
    const account = Account.new(exampleInput);
    account.setFreeze();

    expect(() => {
      account.setBio('test');
    }).toThrow();

    expect(() => {
      account.setNickName('hello@example.com');
    }).toThrow();

    expect(() => {
      account.setPassphraseHash('123');
    }).toThrow();

    expect(() => {
      account.setSilence();
    }).toThrow();

    expect(() => {
      account.setMail('pulsate@example.com');
    }).toThrow();
  });

  it('deleted account can’t change values', () => {
    const account = Account.new(exampleInput);
    account.setDeletedAt(new Date());

    expect(() => {
      account.setBio('test');
    }).toThrow();

    expect(() => {
      account.setNickName('hello@example.com');
    }).toThrow();

    expect(() => {
      account.setPassphraseHash('123');
    }).toThrow();

    expect(() => {
      account.setSilence();
    }).toThrow();

    expect(() => {
      account.setMail('pulsate@example.com');
    }).toThrow();
  });
});

describe('AccountNameSchema', () => {
  const check = (v: unknown) => AccountNameSchema.safeParse(v).success;

  const account = Account.new(exampleInput);

  it('check it is accountname', () => {
    expect(check(account.getName())).toBe(true);

    expect(check('@name@domain')).toBe(true);
    expect(check('@name@example.com')).toBe(true);
    expect(check('@name@xn--example-bs3o55gu19k.com')).toBe(true);
  });

  it('check it is not accountname', () => {
    expect(check('@@')).toBe(false);
    expect(check('@_name_@example.com')).toBe(false);
    expect(check('@name@domain@what')).toBe(false);
    expect(check('what@name@domain')).toBe(false);
    expect(check('@name@example.')).toBe(false);
    expect(check('@name@.example.com')).toBe(false);
    expect(check('@name@example-.com')).toBe(false);
    expect(check('@name@example.com-')).toBe(false);
    expect(check('@name@-example.com')).toBe(false);
    expect(check('@name@example.-com')).toBe(false);
    expect(check('@n_a_m_e_@sharp-#-sharp.com')).toBe(false);
    expect(check('@query@?.com')).toBe(false);
    expect(check('@name@日本語example.com')).toBe(false);
  });
});
