/**
 * Client Anthropic partage - NormX.
 * Source unique pour la creation du client et la validation de la cle.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ServiceUnavailableError } from '../errors';

// Erreur typee : 503 generique cote client, sans fuir le nom de la variable d'env.
export class AnthropicKeyMissingError extends ServiceUnavailableError {
  readonly code = 'AI_PROVIDER_UNAVAILABLE';
  constructor() {
    super('Service IA indisponible.');
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
