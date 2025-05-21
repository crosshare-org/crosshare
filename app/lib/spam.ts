// prettier-ignore
import spam from '../lib/spam.json' with { type: 'json' };

export function checkSpam(input: string): boolean {
  const lower = input.toLowerCase();
  for (const spamWord of spam) {
    if (spamWord === 'arse') {
      if (lower.replace('parse', '').includes(spamWord)) {
        return true;
      }
    } else if (lower.includes(spamWord)) {
      return true;
    }
  }
  return false;
}
