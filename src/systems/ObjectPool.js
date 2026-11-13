// Pool genérico para evitar alocações e GC durante o loop de 60 FPS.

export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 0) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.free = [];
    this.active = [];

    for (let i = 0; i < initialSize; i++) {
      const item = this.createFn();
      if (this.resetFn) this.resetFn(item);
      this.free.push(item);
    }
  }

  acquire() {
    const item = this.free.length > 0 ? this.free.pop() : this.createFn();
    if (this.resetFn) this.resetFn(item);
    this.active.push(item);
    return item;
  }

  release(item) {
    const idx = this.active.indexOf(item);
    if (idx !== -1) {
      this.active.splice(idx, 1);
      if (this.resetFn) this.resetFn(item);
      this.free.push(item);
    }
  }

  releaseAt(activeIndex) {
    const item = this.active[activeIndex];
    if (!item) return;
    const last = this.active.pop();
    if (activeIndex < this.active.length) {
      this.active[activeIndex] = last;
    }
    if (this.resetFn) this.resetFn(item);
    this.free.push(item);
  }

  releaseAll() {
    while (this.active.length > 0) {
      const item = this.active.pop();
      if (this.resetFn) this.resetFn(item);
      this.free.push(item);
    }
  }
}
