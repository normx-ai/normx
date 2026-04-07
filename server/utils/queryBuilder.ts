/**
 * Query Filter Builder — evite la duplication des constructions WHERE dynamiques
 */

export class FilterBuilder {
  private clauses: string[] = [];
  private params: (string | number | string[])[] = [];
  private idx: number;

  constructor(startIdx = 1) {
    this.idx = startIdx;
  }

  /** Ajoute une condition si la valeur est definie et non vide */
  add(field: string, value: string | number | undefined | null, operator = '='): this {
    if (value !== undefined && value !== null && value !== '') {
      this.clauses.push(`${field} ${operator} $${this.idx}`);
      this.params.push(value);
      this.idx++;
    }
    return this;
  }

  /** Ajoute un LIKE (prefixe + suffixe %) */
  addLike(field: string, value: string | undefined | null): this {
    if (value) {
      this.clauses.push(`${field} ILIKE $${this.idx}`);
      this.params.push(`%${value}%`);
      this.idx++;
    }
    return this;
  }

  /** Ajoute une condition ANY (pour les arrays) */
  addAny(field: string, values: string[] | undefined | null): this {
    if (values && values.length > 0) {
      this.clauses.push(`${field} = ANY($${this.idx}::text[])`);
      this.params.push(values);
      this.idx++;
    }
    return this;
  }

  /** Retourne le WHERE clause et les params */
  build(): { clause: string; params: (string | number | string[])[]; nextIdx: number } {
    const clause = this.clauses.length > 0 ? ' AND ' + this.clauses.join(' AND ') : '';
    return { clause, params: this.params, nextIdx: this.idx };
  }

  /** Retourne les params combines avec un tableau initial */
  buildWith(initialParams: (string | number)[]): { clause: string; params: (string | number | string[])[] } {
    const { clause } = this.build();
    return { clause, params: [...initialParams, ...this.params] };
  }
}
