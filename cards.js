/**
 * @fileoverview ES6 module for basic card game UI.
 * Handles clicks, drag-drop, and location tracking.
 */

import {READY} from './util.js';

// TODO(sdh): Consider supporting some mechanism for single/multi-select.
// This makes things a lot harder, so for now we'll leave it out.  Only
// single components may be clicked or dragged.

/**
 * Base interface for everything that can be interacted with.
 * @record
 */
export class Component {
  /** @return {!Element} */
  element() {}
  /** @return {boolean} */
  click() {}
  /** @return {boolean} */
  dblClick() {}
  /** @return {!Array<!Component>} */
  drag() {}
  /**
   * @param {!Array<!Component>} components
   * @return {?function()}
   */
  drop(components) {}
}
const /** !WeakMap<!Element, !Component> */ elementMap = new WeakMap();
Component.register =
    (/** !Element */ element, /** !Component */ component) => {
      try {
        elementMap.set(element, component);
      } catch (e) {
        console.log(`Invalid key: ${element}`);
      }
    };

Component.get = (/** !Element */ element) => elementMap.get(element);

/**
 * Interface for anything that can be placed in a container.
 * @record @extends {Component}
 */
export class Target {
  /** @return {?Location} */
  location() {}
  /**
   * Sets the location internally, does not update the location itself. This
   * must only be called by {@link Location#add} and {@link Location#remove}.
   * @param {?Location} location
   * @return {boolean} True if the update should proceed.
   */
  setLocationInternal(location) {}
}

/**
 * Interface for anything that can act as a container.
 * @record @extends {Component}
 * @template ITEM
 */
export class Location {
  /**
   * @param {ITEM} target
   * @return {boolean} True if the target was removed.
   */
  remove(target) {}

  /**
   * Called after something has been removed.  Must do any clean-up.
   * @param {ITEM} target The removed target.
   */
  postRemove(target) {}

  /** @return {!Array<ITEM>} */
  children() {}

  /**
   * @param {ITEM} target
   * @param {ITEM|number=} before
   * @return {boolean} True if the target was added.
   */
  add(target, before = undefined) {}
}


/**
 * Base class for components, with default implementations.
 * @abstract @implements {Component}
 */
export class AbstractComponent {
  /** @param {!Element} element */
  constructor(element) {
    /** @private @const */
    this.element_ = element;
    Component.register(element, this);
  }
  /** @override */
  element() { return this.element_; }
  /** @override */
  click() { return false; }
  /** @override */
  dblClick() { return false; }
  /** @override */
  drag() { return []; }
  /** @override */
  drop(components) { return null; }

  /**
   * Gets the child element, throws if missing.
   * @param {string} className
   * @return {!Element}
   */
  child(className) {
    const elements = this.element().getElementsByClassName(className);
    if (!elements.length) {
      throw new Error(`missing expected child ${className}`);
    } else if (elements.length > 1) {
      throw new Error(`ambiguous child ${className}`);
    }
    return elements[0];
  }
}

/**
 * Base class for locations.  Includes template methods for
 * managing the element hierarchy.
 * @abstract @implements {Location<ITEM>}
 * @template ITEM
 */
export class AbstractLocation extends AbstractComponent {
  constructor(/** !Element */ element) {
    super(element);
    /** @private @const {!Array<!Target>} */ this.children_ = [];
  }

  /**
   * Template method.  Updates the element by removing the given child.
   * @param {!Element} element
   * @protected
   */
  removeChildElement(element) { this.element().removeChild(element); }

  /**
   * Template method.  Updates the element by appending the given child.
   * @param {!Element} element
   * @protected
   */
  appendChildElement(element) { this.element().appendChild(element); }

  /**
   * Template method.  Updates the element by inserting the given child.
   * @param {!Element} element
   * @param {!Element} before
   * @protected
   */
  insertBeforeElement(element, before) {
    this.element().insertBefore(element, before);
  }

  /**
   * Template method.  Checks whether the given target may be added.
   * @param {ITEM} target
   * @param {number} before
   * @return {boolean} True if the target can be added at the position.
   * @protected
   */
  canAdd(target, before) { return true; }

  /**
   * Template method.  Checks whether the given target may be removed.
   * @param {ITEM} target
   * @return {boolean} True if the target can be removed.
   * @protected
   */
  canRemove(target) { return true; }

  /** @override */
  remove(target) {
    if (!(target instanceof Target) ||
        this != target.location() ||
        !this.canRemove(target) ||
        !target.setLocationInternal(null)) {
      return false;
    }
    const index = this.children_.indexOf(target);
    if (index < 0) return false;
    this.removeChildElement(target.element());
    if (!!this.children_.splice(index, 1)) {
      this.postRemove(target);
      return true;
    }
    return false;
  }

  /** @override */
  postRemove(target) {
    const index = this.children_.indexOf(target);
    if (index >= 0) this.children_.splice(index, 1);
    // assume that the element has already been relocated
  }

  /** @override */
  children() { return this.children_.slice(); }

  /** @override */
  add(target, before = undefined) {
    if (!(target instanceof Target)) return false;
    if (before == undefined) {
      before = this.children_.length;
    } else if (typeof before != 'number') {
      before = this.children_.indexOf(before);
      if (before < 0) return false;
    }
    const previous = target.location();
    if (!this.canAdd(target, before) || !target.setLocationInternal(this)) {
      return false;
    } else if (before == this.children_.length) {
      this.children_.push(target);
      this.appendChildElement(target.element());
    } else {
      this.children_.splice(before, 0, target);
      this.insertBeforeElement(
          target.element(), this.children_[before + 1].element());
    }
    if (previous) previous.postRemove(target);
    return true;
  }
}

/**
 * An area for cards and card groups.  This is a base class
 * for both areas of the table, and various piles.
 * @abstract @extends {AbstractLocation<ITEM>}
 * @template ITEM
 */
export class CardArea extends AbstractLocation {}

/**
 * A stack of cards.  Provides rendering options for whether
 * The top is face-up or not, whether the contents may be
 * inspected, and whether the height is shown.
 * @extends {CardArea<ITEM>}
 * @template ITEM
 */
export class CardStack extends CardArea {
  /**
   * TODO(sdh): 3 boolean args is hideous. Consider an enum
   * with var_args, but would want composable behavior...?
   *
   * @param {boolean} faceUp
   * @param {boolean} inspectable
   * @param {boolean} height
   */
  constructor(faceUp, inspectable, height) {
    super(template('stack'));
    /** @private @const {!Element} */
    this.top_ = faceUp ? this.child('top') : document.createElement('div');
    /** @private @const {!Element} */
    this.contents_ = this.child('contents');
    if (!inspectable) this.contents_.parentElement.removeChild(this.contents_);
    /** @private @const {!Element} */
    this.height_ = this.child('height');
    if (!height) this.height_.parentElement.removeChild(this.height_);
  }

  /** @override */
  removeChildElement(element) {
    this.contents_.removeChild(element);
    this.update_();
  }
  /** @override */
  appendChildElement(element) {
    this.contents_.appendChild(element);
    this.update_();    
  }
  /** @override */
  insertBeforeElement(element, before) {
    this.contents_.insertBefore(element, before);
    this.update_();    
  }

  /** @private */
  update_() {
    // put the correct element into the stack's display if faceUp
    const top = this.top_;
    while (top.children.length) top.removeChild(top.firstChild);
    if (this.contents_.children.length) {
      top.appendChild(
          this.contents_.children[this.contents_.children.length - 1]
              .cloneNode(true));
    }
  }
}

/**
 * @abstract @extends {AbstractLocation<ITEM>}
 * @implements {Target}
 * @template ITEM
 */
export class CardGroup extends AbstractLocation {
  constructor(/** !Element */ element) {
    super(element);
    /** @private */ this.location_ = null;
  }
  /** @override */ location() { return this.location_; }
  /** @override */
  setLocationInternal(location) {
    if (!this.canSetLocation(location)) return false;
    this.location_ = location;
    return true;
  }
  /**
   * Called by setLocationInternal to see if we should allow it.  For override.
   * @param {?Location} location
   * @return {boolean}
   * @protected
   */
  canSetLocation() { return true; }
  /** @override */
  canAdd(target, before) { return target instanceof Card; }
  /** Removes all children and adds directly to parent. */
  collapse() {
    let i = 0;
    while (i < this.children_.length) {
      const child = this.children_[i];
      if (this.location().add(child, this)) {
        //this.children_.splice(i, 1);
        //this.location().remove(this);
      } else {
        i++;
      }
    }
    // note: possible it's already been removed?
    if (this.location()) this.location().remove(this);
  }
}

/**
 * A `CardGroup` that collapses to empty when it becomes a singleton.
 * @extends {CardGroup<ITEM>}
 * @template ITEM
 */
export class CollapsibleCardGroup extends CardGroup {
  /** @override */
  postRemove(target) {
    if (this.children_.length <= 1) this.collapse();
  }
}

/** @abstract @implements {Target} */
export class Card extends AbstractComponent {
  constructor(/** !Element */ element) {
    super(element);
    /** @private */ this.location_ = null;
  }

  /** @override */ location() { return this.location_; }
  /** @override */
  setLocationInternal(location) {
    if (!this.canSetLocation(location)) return false;
    this.location_ = location;
    return true;
  }
  /**
   * Called by setLocationInternal to see if we should allow it.  For override.
   * @param {?Location} location
   * @return {boolean}
   * @protected
   */
  canSetLocation(location) { return true; }
}

// Initialize the drag-and-drop
READY.then(() => {
  let dragging = []; // [...Target]
  let origin = []; // [number, number]
  let dropTarget = null; // ?Element
  let drop = null; // ?function()

  function reset() {
    if (!dragging) return;
    for (const c of dragging) {
      c.element().style.left = c.element().style.top = '0px';
      c.element().style.zIndex = 0;
      c.element().style.pointerEvents = 'auto';
      c.element().classList.remove('dragging');
      c.element().classList.remove('drop-ok');
    }
    document.body.classList.remove('dragging');
    document.body.classList.remove('drop-ok');
    if (dropTarget) dropTarget.classList.remove('drop-target');
    dragging = [];
    dropTarget = null;
    drop = null;
  }

  function* components(target) {
    while (target) {
      const component = Component.get(target);
      if (component) yield component;
      target = target.parentElement;
    }
  }

  document.body.addEventListener('dblclick', e => {
    for (const component of components(e.target)) {
      if (component.dblClick()) return;
    }
  });

  document.body.addEventListener('mousedown', e => {
    let targets = [];
    for (const component of components(e.target)) {
      targets = component.drag();
      if (targets.length) break;
    }
    if (!targets.length) return;
    reset();
    dragging = targets;
    origin = [e.x, e.y];
    for (const c of dragging) {
      c.element().style.pointerEvents = 'none';
      c.element().style.zIndex = 1;
      c.element().classList.add('dragging');
      document.body.classList.add('dragging');
    }
  });

  document.body.addEventListener('mousemove', e => {
    if (!dragging.length) return;
    if (dropTarget) dropTarget.classList.remove('drop-target');
    if (e.target != dropTarget) {
      drop = null;
      for (const c of components(e.target)) {
        drop = c.drop(dragging);
        if (drop) {
          dropTarget = c.element();
          break;
        }
      }
    }
    for (const c of dragging) {
      c.element().style.left = `${e.x - origin[0]}px`;
      c.element().style.top = `${e.y - origin[1]}px`;
      c.element().classList.toggle('drop-ok', !!dropTarget);
    }
    document.body.classList.toggle('drop-ok', !!dropTarget);
    if (dropTarget) dropTarget.classList.add('drop-target');
  });

  document.body.addEventListener('mouseup', e => {
    if (!dragging) return;
    const savedDrop = drop;
    reset();
    if (savedDrop) savedDrop();
  });
});

