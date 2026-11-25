import { generateHandle, handleBase } from './handle';

describe('generateHandle', () => {
  it('normalizes display names into valid handles', () => {
    expect(handleBase('  Crème Brûlée!  ')).toBe('creme_brulee');
    expect(handleBase('A')).toBe('a_creator');
    expect(handleBase('!!!')).toBe('creator');
    expect(handleBase('A'.repeat(40))).toHaveLength(30);
  });

  it('adds a bounded random suffix when the preferred handle exists', () => {
    const handle = generateHandle('Crema Brulee', new Set(['crema_brulee']), () =>
      Buffer.from('deadbeef', 'hex'),
    );

    expect(handle).toBe('crema_brulee_deadbeef');
    expect(handle).toHaveLength(21);
  });

  it('does not exceed the contract handle limit after collision resolution', () => {
    const base = handleBase('A very long creator display name');
    const handle = generateHandle('A very long creator display name', new Set([base]), () =>
      Buffer.from('deadbeef', 'hex'),
    );

    expect(handle).toHaveLength(30);
    expect(handle).toMatch(/^[a-z0-9_]+$/);
  });
});
