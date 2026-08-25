export class UndoStack<T> {
  private past: T[] = [];
  private future: T[] = [];

  constructor(private readonly limit = 100) {}

  push(state: T): void {
    this.past.push(state);
    if (this.past.length > this.limit) {
      this.past.shift();
    }
    this.future = [];
  }

  undo(current: T): T | null {
    const previous = this.past.pop();
    if (!previous) {
      return null;
    }
    this.future.push(current);
    return previous;
  }

  redo(current: T): T | null {
    const next = this.future.pop();
    if (!next) {
      return null;
    }
    this.past.push(current);
    return next;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
