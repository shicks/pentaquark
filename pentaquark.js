// System:
// interface Target {
//   ?Location location();
//   void remove();
// }
// interface Card extends Target {
//   Target[] drag();
// }
//   
// interface Location extends Target {
//   add(??);
// }
//
// class CardGroup implements Location {
//
// }

// Draggable vs Clickable?
//  - we only allow dragging individual cards, but
//    we dblclick groups...
//  - what if draggable nested inside draggable?!? how to pick outer/inner?
//    - then need to provide a handle to drag the outer...
// Broadcast signals -
//    "who can be dragged", "who can be clicked", "who can accept"
//    or maybe some can be more localized... return t/f


/** @record @extends {Component} */
class Target {
  /** @return {?Location} */ location() {}
  /**
   * Sets the location internally, does not update the location itself. This
   * must only be called by {@link Location#add} and {@link Location#remove}.
   * @param {?Location} location
   * @return {boolean} True if the update should proceed.
   */
  setLocation(location) {}
}

/** @record @extends {Component} */
class Location {
  /**
   * @param {!Target} target
   * @return {boolean} True if the target was removed.
   */
  remove(target) {}

  /** @return {!Array<!Target>} */
  children() {}

  /**
   * @param {!Target} target
   * @param {!Target|number=} before
   * @return {boolean} True if the target was added.
   */
  add(target, before = undefined) {}
}

// TODO - allow selection?!? that's a lot harder
//   - for now, just click/drag single items...

/** @record */
class Component {
  /** @return {!Element} */ element() {}
  /** @return {boolean} */ click() {}
  /** @return {boolean} */ dblClick() {}
  /** @return {!Array<!Component>} */ drag() {}
  /**
   * @param {!Array<!Component>} components
   * @return {?function()}
   */
  drop(components) {}
}

(function() {
  const /** !WeakMap<!Element, !Component> */ map = new WeakMap();
  Component.register =
      (/** !Element */ element, /** !Component */ component) => {
        map.set(element, component);
      };
  Component.get = (/** !Element */ element) => map.get(element);
})();
// top-level event listener simply calls these methods...

/** @abstract @implements {Component} */
class AbstractComponent {
  constructor(/** !Element */ element) {
    /** @private @const */ this.element_ = element;
    Component.register(element, this);
  }
  /** @override */ element() { return this.element_; }
  /** @override */ click() { return false; }
  /** @override */ dblClick() { return false; }
  /** @override */ drag() { return []; }
  /** @override */ drop(components) { return null; }
}

/** @abstract @implements {Location} */
class AbstractLocation extends AstractComponent {
  constructor(/** !Element */ element) {
    super(element);
    /** @private @const {!Array<!Target>} */ this.children_ = [];
  }

  /** @protected */
  removeChildElement(/** !Element */ element) {
    this.element().removeChild(element);
  }

  /** @protected */
  appendChildElement(/** !Element */ element) {
    this.element().appendChild(element);
  }

  /** @protected */
  insertBeforeElement(/** !Element */ element, /** !Element */ before) {
    this.element().insertBefore(element, before);
  }

  /**
   * @param {!Target} target
   * @param {number} before
   * @return {boolean} True if the target can be added at the position.
   * @protected
   */
  canAdd(/** !Target */ target, /** number */ before) { return true; }

  /**
   * @param {!Target} target
   * @return {boolean} True if the target can be removed.
   * @protected
   */
  canRemove(/** !Target */ target) { return true; }

  /** @override */
  remove(target) {
    if (this != target.location() ||
        !this.canRemove(target) ||
        !target.setLocation(null)) {
      return false;
    }
    const index = this.children_.indexOf(target);
    if (index < 0) return false;
    this.removeChildElement(target.element());
    return !!this.children_.splice(index, 1);
  }

  /** @override */
  children() { return this.children_.slice(); }

  /** @override */
  add(target, before = undefined) {
    if (before == undefined) {
      before = this.children_.length;
    } else if (typeof before != 'number') {
      before = this.children_.indexOf(before);
      if (before < 0) return false;
    }
    if (!this.canAdd(target, before) || !target.setLocation(this)) return false;
    if (before == this.children_.length) {
      this.children_.push(target);
      this.appendChildElement(target.element());
    } else {
      this.children_.splice(before, 0, target);
      this.insertBeforeElement(
          target.element(), this.children_[before].element());
    }
    return true;
  }
}

class CardArea extends AbstractLocation {}

/** @abstract @implements {Target} */
class CardGroup extends AbstractLocation {
  constructor(/** !Element */ element) {
    super(element);
    /** @private */ this.location_ = null;
  }
  /** @override */ location() { return this.location_; }
  /** @override */
  setLocation(location) {
    if (!this.canSetLocation(location)) return false;
    this.location_ = location;
    return true;
  }
  /**
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
        thils.children_.splice(i, 1);
        this.location().remove(this);
      } else {
        i++;
      }
    }
  }
}

/** A `CardGroup` that collapses to empty when it becomes a singleton. */
class CollapsibleCardGroup extends CardGroup {
  /** @override */
  remove(target) {
    if (super.remove(target) && this.children_.length == 1) this.collapse();
  }
}

/** @abstract @implements {Target} */
class Card extends AbstractComponent {
  constructor(/** !Element */ element) {
    super(element);
    /** @private */ this.location_ = null;
  }

  /** @override */ location() { return this.location_; }
  /** @override */
  setLocation(location) {
    if (!this.canSetLocation(location)) return false;
    this.location_ = location;
    return true;
  }
  /**
   * @param {?Location} location
   * @return {boolean}
   * @protected
   */
  canSetLocation() { return true; }
}

(() => {
  // Let's figure out how to do drag-and-drop...?
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
      c.element().classList.remove('dropOk');
    }
    document.body.classList.remove('dragging');
    dragging = [];
    dropTarget = null;
    drop = null;
  }

  function* componets(target) {
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
    if (e.target != dropTarget) {
      dropTarget = e.target;
      drop = null;
      for (const c of components(e.target)) {
        drop = c.drop(dragging);
        if (drop) break;
      }
    }
    for (const c of dragging) {
      c.element().style.left = `${e.x - origin[0]}px`;
      c.element().style.top = `${e.y - origin[1]}px`;
      c.element().classList.toggle('dropOk', !!dropTarget);
    }
  });

  document.body.addEventListener('mouseup', e => {
    if (!dragging) return;
    const savedDrop = drop;
    reset();
    if (savedDrop) savedDrop();
  });
})();


// Game-specific implementation...?


class Quark extends Card {
  constructor(/** !Flavor */ flavor, /** !Color */ color, /** boolean */ anti) {
    super(template('quark'));
    /** @private @const */ this.flavor_ = flavor;
    /** @private @const */ this.color_ = color;
    /** @private */ this.anti_ = anti;
    // set up the element?
  }

  // TODO - ability to confine, annihilate, etc...
  // TODO - color and flavor as numbers for easier math?  signed for anti?

}

// Let's figure out how to do drag-and-drop...?

(() => {
  let dragging;
  let origin;

  function dissolve(group) {
    while (group.children.length) {
      group.parentElement.insertBefore(group.firstChild, group);
    }
    group.parentElement.removeChild(group);
  }

  function reset() {
    if (!dragging) return;
    dragging.style.left = dragging.style.top = '0px';
    dragging.style.zIndex = 0;
    dragging.style.pointerEvents = 'auto';
    dragging = undefined;
  }

  document.body.addEventListener('dblclick', e => {
    // find a .card target, maybe one not in a .card-group?
    // const target = e.target.closest(':not(.card-group) > .card');
    const target = e.target.closest('.card-group');
    if (target) dissolve(target);
  });

  document.body.addEventListener('mousedown', e => {
    // find a .card target, maybe one not in a .card-group?
    // const target = e.target.closest(':not(.card-group) > .card');
    const target = e.target.closest('.card');
    if (target) {
      reset();
      dragging = target;
      origin = [e.x, e.y];
      dragging.style.pointerEvents = 'none';
      dragging.style.zIndex = 1;
      document.body.classList.add('dragging');
    }
  });

  document.body.addEventListener('mousemove', e => {
    if (!dragging) return;
    dragging.style.left = `${e.x - origin[0]}px`;
    dragging.style.top = `${e.y - origin[1]}px`;
  });

  document.body.addEventListener('mouseup', e => {
    let currentGroup;
    try {
      if (!dragging) return;
      // find a .card target, maybe one not in a .card-group?
      const target = e.target.closest('.card');
      currentGroup = dragging.parentElement;
      if (!currentGroup.classList.contains('card-group')) {
        currentGroup = undefined;
      }
      if (!target || target == dragging) {
        return;
      }
      if (target.parentElement.classList.contains('card-group')) {
        target.parentElement.appendChild(dragging);
      } else {
        const group = document.createElement('div');
        group.classList.add('card-group');
        target.parentElement.insertBefore(group, target);
        group.appendChild(target);
        group.appendChild(dragging);
      }
    } finally {
      reset();
      if (currentGroup && currentGroup.children.length == 1) {
        dissolve(currentGroup);
      }
      document.body.classList.remove('dragging');
    }
    
  });
})();


// class Location {
//   constructor() {
//     // a .card-area element (or maybe the deck/annihilated/discard?)
//     this.element = undefined;
//   }
//   add(card) {
//     // depends on which location we are...?
//     // could also add confinements?
//   }
// }

// Detector and background
class Persistent extends Location {
  constructor() {
    super();
    this.members = [];
  }
  add(card) {
    if (card instanceof Quark) {
      for (const member of this.members) {
        if (member instanceof Quark && card.annihilates(member)) {
          card.annihilate();
          member.annihilate();
          // TODO - what if two options available? need to choose
          //   --> promise... :-/ (disable rest of UI until selected)
          //   .disabled{pointer-events:none}, then add .enabled to choices?
          //   - or .disabled .card to prevent cascading?

          //   -- just block the whole move, unless added on top of
          //      a free anti-particle.

          // drop a new quark into a stable confinement, kick out same type
          return;
        }
      }
    }
  }
}

// this is a nested location...?
class Confinement {
  constructor() {
    this.quarks = [];
    this.element = undefined;
    this.location = undefined;
  }

  add(quark) {
    if (!this.canAccept(quark)) return;
    this.quarks.push(quark);
  }

  canAccept(q) {
    if (!this.quarks.length) return true;
    const a = this.quarks[0];
    const b = this.quarks[1];
    if (a.color == q.color) {
      // color-anticolor pair
      return this.quarks.length == 1 && a.anti != q.anti;
    } else {
      return this.quarks.length < 3 && a.anti == q.anti &&
          (!b || (b.anti == q.anti && b.color != q.color));
    }
  }

  isStable() {
    const a = this.quarks[0];
    const b = this.quarks[1];
    const c = this.quarks[2];
    return c || (b && a.color == b.color);
  }

  dissolve() {
    for (const q of this.quarks) {
      this.location.add(q);
    }
    this.location.remove(this);
  }
}


class Quark {
  constructor(/** !Flavor */ flavor, /** !Color */ color, /** boolean */ anti) {
    this.flavor = flavor;
    this.color = color;
    this.anti = anti;
    this.element = undefined;
    this.location = undefined;
  }

  isConfined() {
    return this.location instanceof Confinement && this.location.isStable();
  }

  annihilates(that) {
    return this.flavor == that.flavor && this.anti != that.anti;
  }
}

// Given a set of quarks, find all possible confinement combinations
// Need a UI to indicate which combination to confine. Possibly just a "Pick quarks to annihilate".

/** @enum */
const Flavor = {
  UP: 'u',
  DOWN: 'd',
  CHARM: 'c',
  STRANGE: 's',
  BOTTOM: 'b',
  TOP: 't',
};

/** @enum */
const Color = {
  RED: 'red',
  GREEN: 'green',
  BLUE: 'blue',
};

const ANTICOLORS = {
  [Color.RED]: 'cyan',
  [Color.GREEN]: 'magenta',
  [Color.BLUR]: 'yellow',
};
