import { Injectable } from '@angular/core';
import { Command, ScoredCommand } from './command.model';

const MAX_RESULTS = 20;

@Injectable({ providedIn: 'root' })
export class FuzzySearchService {
  // TODO: Add category-scoped search prefixes (> for actions, / for navigation)

  search(query: string, commands: Command[]): ScoredCommand[] {
    if (!query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase();

    const scored: ScoredCommand[] = [];
    for (const command of commands) {
      const labelScore = this.score(lowerQuery, command.label.toLowerCase());
      let bestKeywordScore = 0;
      for (const kw of command.keywords) {
        const kwScore = this.score(lowerQuery, kw.toLowerCase());
        if (kwScore > bestKeywordScore) {
          bestKeywordScore = kwScore;
        }
      }
      const finalScore = Math.max(labelScore, bestKeywordScore * 0.9);
      if (finalScore > 0) {
        scored.push({ command, score: finalScore });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, MAX_RESULTS);
  }

  /**
   * Lightweight consecutive-character fuzzy scorer.
   * Bonuses: consecutive matches, prefix match, exact case match.
   */
  private score(query: string, target: string): number {
    if (target.includes(query)) {
      // Substring match — high score with prefix bonus
      const prefixBonus = target.startsWith(query) ? 50 : 0;
      return 100 + prefixBonus + (query.length / target.length) * 50;
    }

    let score = 0;
    let queryIdx = 0;
    let consecutive = 0;
    let firstMatchBonus = 0;

    for (let i = 0; i < target.length && queryIdx < query.length; i++) {
      if (target[i] === query[queryIdx]) {
        queryIdx++;
        consecutive++;
        score += 10 + consecutive * 5;
        if (i === 0 && queryIdx === 1) {
          firstMatchBonus = 20;
        }
      } else {
        consecutive = 0;
      }
    }

    if (queryIdx < query.length) {
      return 0; // Not all query characters found
    }

    return score + firstMatchBonus;
  }
}
