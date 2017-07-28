const promises = [];

/**
 * 
 * @template T
 */
export class Present {
  constructor(/** !Promise<T> */ promise) {
    promises.push(promise);
    /** @private {boolean} */
    this.done_ = false;
    /** @private {T|undefined} */
    this.value_ = undefined;
    /** @private {!Error|undefined} */
    this.error_ = undefined;
    /** @private {!Promise<T>} */
    this.promise_ = promise.then((value) => {
      this.value_ = value;
      this.done_ = true;
    }, (error) => {
      this.error_ = error;
    });
  }

  /** @return {T} */
  get() {
    if (!this.done_) throw this.error_ || new Error('Never resolved.');
    return this.value_;
  }

  /** @return {!Promise<undefined>} */
  static wait() {
    return Promise.all(promises).then(() => undefined);
  }
}
