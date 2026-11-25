export function resolveCountryPolicy<Policy>(
  countryPolicy: Policy | null,
  globalPolicy: Policy | null,
): Policy | null {
  return countryPolicy ?? globalPolicy;
}
