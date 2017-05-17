class Quark {
  constructor(/** !Flavor */ flavor, /** !Color */ color, /** boolean */ anti) {
    this.flavor = flavor;
    this.color = color;
    this.anti = anti;
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
