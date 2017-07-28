/**
 * @fileoverview DOM manipulation code. Basic approach is to have a
 * non-display 'templates' class that we clone nodes from. Is there
 * any need to take parameters and fill anything in?
 */

import {READY, define} from './util.js';

/**
 * Whether to read 
 * @define {boolean}
 */
goog.define('BUNDLED', false);
const BUNDLED = define('BUNDLED');

export class Template {
  constructor(/** !Element */ element) {
    /** @const {!Map<string, !Element>} */
    this.map = new Map();
    for (const child of element.children) {
      this.map.set(child.className, child);
    }
  }

  /**
   * @param {string} name
   * @return {!Element} Newly cloned tree
   */
  clone(name) {
    const e = this.map.get(name);
    return /** @type {!Element} */ (e.cloneNode(true));
  }

  /**
   * @param {string} filename
   * @return {!Promise<!Template>}
   */
  static load(filename) {
    const cls = filename.replace(/\.html$/, '');
    return READY.then(() => new Promise((ok, fail) => {
      function resolve(element) {
        element = element && element.querySelector(`.templates.${cls}`);
        if (element) {
          ok(new Template(element));
        } else {
          fail(new Error(`No such template: ${filename}`));
        }
      }
      if (BUNDLED) {
        // TODO(sdh): how to ensure the correct class when concatenating,
        // what about conflicts from unrelated packages?!?
        resolve(document);
      } else {
        const link = document.createElement('link');
        link.rel = 'import';
        link.href = filename;
        link.addEventListener('load', () => resolve(link.import));
        document.body.appendChild(link);
      }
    }));
  }
}
