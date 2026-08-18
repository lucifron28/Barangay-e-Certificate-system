export const DEMO_PASSWORD_MIN_LENGTH = 14;

const WEAK_PASSWORD_TERMS = [
  "admin",
  "changeme",
  "demo",
  "password",
  "qwerty",
  "secretary",
];

export function assertStrongDemoPassword(variableName: string, value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized.length < DEMO_PASSWORD_MIN_LENGTH) {
    throw new Error(`${variableName} must be at least ${DEMO_PASSWORD_MIN_LENGTH} characters.`);
  }

  if (WEAK_PASSWORD_TERMS.some((term) => normalized.includes(term))) {
    throw new Error(`${variableName} is too predictable for a demo account.`);
  }

  return value.trim();
}
