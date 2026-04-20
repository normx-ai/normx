/**
 * Client Anthropic partage - NormX.
 * Source unique pour la creation du client et la validation de la cle.
 */

import Anthropic from '@anthropic-ai/sdk';

// Erreur typee pour distinguer cote route et retourner un 503 generique
// sans fuir le nom exact de la variable d'env au client.
export class AnthropicKeyMissingError extends Error {
  constructor() {
    super('ANTHROPIC_API_KEY non configuree');
    this.name = 'AnthropicKeyMissingError';
  }
}

export function hasAnthropicKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AnthropicKeyMissingError();
  return new Anthropic({ apiKey });
}
