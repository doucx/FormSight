import { registry } from '../core/registry';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db';

export * from './schemas';

export function getCardById(id: string): CardDefinition | undefined {
  return registry.getCardById(id);
}

export function getCardsByDomain(domain: TrainingDomain): CardDefinition[] {
  return registry.getCardsByDomain(domain);
}