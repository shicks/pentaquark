import {Card, CardArea, CardGroup} from './cards.js';
import {Template} from './template.js';
import {css} from './util.js';
import {Present} from './present.js';

// Initialization
css('cards.css');
const cards = new Present(Template.load('cards.html'));


// TODO - rethink the presentation...
//  - why are these cards, why not just circles?
//  - more thematic
//  - dragging is over-complicated
//  - instead, just click on the relevant ones
//  ---> "scatter", "detector", "discard"
//  - if pick a quark that requires an annihilation, then
//    present a list of possible pairs
//  - if click on a confined group, automatically unconfine
//  - if click on an unconfined quark, present list of possible confinements
//  - use a draggable dialog box for choices?  -> modal
//  - then just need to be able to draw the current state...
//  - or... beam is replaced with current choice, possibility of a cancel
//    button in some circumstances...?

///////////////////////
//
//  SCATTERED
//
// --------------------
//           |  Options:
//  BEAM     |
//           |



// Data structures

/**
 * An area that persists across rounds.
 * @extends {CardArea<!Confinement>}
 */
class Persistent extends CardArea {
  constructor() {
    super(cards.get().clone('card-area'));
  }
  /** @override */
  drop(card) {
    // TODO - consider modes - in a decision mode, don't do normal stuff
    if (!(card instanceof Quark)) return null;

    // TODO - where is the quark coming from? - must not be the other
    // Persistent, and if it's the beam, we need to make sure the quarks
    // go to the right place, in the right order, etc...

    // TODO - give a message somewhere about needing to annihilate?
    if (this.unconfined().any(quark => card.annihilates(quark))) return null;
    return () => {
      const g = new Confinement();
      this.add(g);
      g.add(card);
    };
  }
  /** @return {!Array<!Quark>} */
  unconfined() {
    const /** !Array<!Quark> */ out = [];
    for (const /** !Confinement */ m of this.children()) {
      if (!m.isConfined()) {
        out.push(...m.children());
      }
    }
    return out;
  }
}

/**
 * Contains several quarks, which may or may not actually be stably confined.
 * @extends {CardGroup<!Quark>}
 */
class Confinement extends CardGroup {
  constructor() {
    super(cards.get().clone('card-group'));
    this.color = Color.ZERO;
    this.size = 0;
  }

  /** @override */
  drop(card) {
    if (!(card instanceof Quark)) return null;
    if (this.size >= 3 || this.color.plus(card.color) > 1) return null;
    return () => this.add(card);
  }

  /** @override */
  add(quark) {
    if (!(quark instanceof Quark)) return false;
    const color = this.color.plus(quark.color);
    if (this.size >= 3 || color > 1) return false;
    if (super.add(quark)) {
      this.color = color;
      this.size++;
      return true;
    }
    return false;
  }

  /** @return {boolean} Whether the quarks are confined. */
  isConfined() {
    return this.size && this.color == 0;
  }

  /** Split the confinement into separate pieces */
  dissolve() {
    const c = this.children();
    for (const q of c.slice(0, c.length - 1)) {
      const g = new Confinement();
      this.location().add(g, this);
      g.add(q);
    }
  }

  /** @override */
  postRemove(quark) {
    this.color = this.color.minus(quark.color);
    this.size--;
    const loc = this.location();
    if (!--this.size && loc) loc.remove(this);
  }
}

class Quark extends Card {
  constructor(/** !Flavor */ flavor, /** !Color */ color) {
    super(cards.get().clone('card'));
    this.flavor = flavor;
    this.color = color;

    this.element().classList.add(String(color));
    this.child('index').textContent = flavor;
    this.child('body').textContent = flavor;
  }

  isConfined() {
    const location = this.location();
    return location instanceof Confinement && location.isConfined();
  }

  annihilates(that) {
    return this.flavor == that.flavor && this.color.plus(that.color) == 3;
  }

  annihilate() {
    // TODO - need an annihilated pile
    this.location().remove(this);
  }

  drag() {
    return [this];
  }

  drop(card) {
    if (card instanceof Quark && this.annihilates(card)) return () => {
      this.annihilate();
      card.annihilate();
    };
    return null;
  }
}

class Color {
  constructor(red, blue) {
    this.red = red;
    this.blue = blue;
  }
  valueOf() {
    // 0 == confined
    // 1 == valid color for 1 or 2 not-yet-confined quarks
    // 3, 4, 7, etc = will never be confined
    return Math.round((this.blue - this.red / 2) ** 2 + this.red ** 2 * 3 / 4);
  }
  toString() {
    const value = this.valueOf();
    if (!value) return 'zero';
    if (value != 1) return 'invalid';
    return ['green', 'cyan', '', 'yellow', '', 'blue', '', 'red', 'magenta']
        [3 + 2 * this.red + this.blue];
  }
  isAnti() {
    return this.red * this.blue < 0 || this.red < 0 || this.blue < 0;
  }
  plus(that) {
    return new Color(this.red + that.red, this.blue + that.blue);
  }
  minus(that) {
    return new Color(this.red - that.red, this.blue - that.blue);
  }
  negate() {
    return new Color(-this.red, -this.blue);
  }
  abs() {
    return this.isAnti() ? this.negate() : this;
  }
}
Color.RED = new Color(1, 0);
Color.BLUE = new Color(0, 1);
Color.GREEN = new Color(-1, -1);
Color.CYAN = new Color(-1, 0);
Color.YELLOW = new Color(0, -1);
Color.MAGENTA = new Color(1, 1);
Color.ZERO = new Color(0, 0);

/** @enum */
const Flavor = {
  UP: 'u',
  DOWN: 'd',
  CHARM: 'c',
  STRANGE: 's',
  BOTTOM: 'b',
  TOP: 't',
};

class QuarkArea extends CardArea {
  constructor() {
    super(cards.get().clone('card-area'));
  }

  drop(quarks) {
    // possibly need to do stuff with previous group???
    return () => {
      const group = new QuarkGroup();
      group.drop(quarks)();
      this.add(group);
    };
  }
}

class QuarkGroup extends CardGroup {
  constructor() {
    super(cards.get().clone('card-group'));
  }

  drop(quarks) {
    return () => { for (const q of quarks) this.add(q); };
  }

  postRemove(target) {
    super.postRemove(target);
    if (this.children().length == 0) {
      this.location().remove(this);
    }
  }

  dblClick() {
    const parent = this.location();
    for (const child of this.children()) {
      const g = new QuarkGroup();
      parent.add(g, this);
      g.add(child);
    }
  }
}


Present.wait().then(() => {
  const c = cards.get();
  const area = new QuarkArea();
  document.getElementById('main').appendChild(area.element());

  const g1 = new QuarkGroup();
  const g2 = new QuarkGroup();
  const g3 = new QuarkGroup();
  area.add(g1);
  area.add(g2);
  area.add(g3);

  g1.add(new Quark('u', 'red', true));
  g1.add(new Quark('d', 'red', false));

  g2.add(new Quark('b', 'red', true));
  g2.add(new Quark('s', 'green', true));
  g2.add(new Quark('c', 'blue', true));

  g3.add(new Quark('s', 'blue', false));
});
