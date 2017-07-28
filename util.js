/**
 * @fileoverview Basic utility functions.
 */

export const READY = new Promise((ok) => {
  if (document.readyState == 'loading') {
    document.addEventListener('load', ok);
  } else {
    ok();
  }
});

/**
 * @param {string} name
 * @param {T=} val
 * @return {T|undefined} Previous value
 * @template T
 */
export function define(name, val = undefined) {
  const parts = name.split('.');
  let obj = window;
  for (let i = 0; i < parts.length - 1; i++) {
    obj = (obj[parts[i]] = obj[parts[i]] || {});
  }
  const last = parts[parts.length - 1];
  const ret = obj[last];
  if (val != undefined) obj[last] = val;
  return ret;  
}

export function css(file) {
  READY.then(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = file;
    document.body.appendChild(link);
  });
}

define('goog.define', define);
