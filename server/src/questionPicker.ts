import { QUESTIONS, type Question, type QuestionCategory } from "@qui/shared";

export class QuestionPicker {
  private remaining: Question[];
  private categories: Set<QuestionCategory>;

  constructor(categories: QuestionCategory[]) {
    this.categories = new Set(categories);
    this.remaining = shuffle(
      QUESTIONS.filter((q) => this.categories.has(q.category))
    );
  }

  /** Returns the next question, refilling the deck if exhausted. */
  public next(): Question {
    if (this.remaining.length === 0) {
      this.remaining = shuffle(
        QUESTIONS.filter((q) => this.categories.has(q.category))
      );
    }
    // Non-empty guaranteed: categories are validated upstream to be non-empty.
    return this.remaining.pop()!;
  }

  public setCategories(categories: QuestionCategory[]): void {
    this.categories = new Set(categories);
    this.remaining = shuffle(
      QUESTIONS.filter((q) => this.categories.has(q.category))
    );
  }
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}
