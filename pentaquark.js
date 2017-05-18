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


class Location {
  constructor() {
    // a .card-area element (or maybe the deck/annihilated/discard?)
    this.element = undefined;
  }
  add(card) {
    // depends on which location we are...?
    // could also add confinements?
  }
}

class Persistenet extends Location {
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
