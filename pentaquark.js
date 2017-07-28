import {Card, CardArea, CardGroup} from './cards.js';
import {Template} from './template.js';
import {css} from './util.js';
import {Present} from './present.js';

// Initialization
css('cards.css');
const cards = new Present(Template.load('cards.html'));

// Actual classes
class Quark extends Card {
  constructor(name, color, anti) {
    super(cards.get().clone('card'));
    if (anti) this.element().classList.add('anti');
    this.element().classList.add(color);
    this.child('index').textContent = name;
    this.child('body').textContent = name;
  }

  drag() {
    return [this];
  }
}

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
