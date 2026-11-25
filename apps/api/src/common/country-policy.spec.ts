import { resolveCountryPolicy } from './country-policy';

describe('resolveCountryPolicy', () => {
  const globalPolicy = { id: 'GLOBAL', signupEnabled: true };
  const usPolicy = { id: 'US', signupEnabled: false };

  it('prefers the exact country policy', () => {
    expect(resolveCountryPolicy(usPolicy, globalPolicy)).toBe(usPolicy);
  });

  it('falls back to GLOBAL when no country override exists', () => {
    expect(resolveCountryPolicy(null, globalPolicy)).toBe(globalPolicy);
  });

  it('fails closed when neither policy exists', () => {
    expect(resolveCountryPolicy(null, null)).toBeNull();
  });
});
