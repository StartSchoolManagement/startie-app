// Level 9 configuration - laptop required with while loop challenge
// Based on level 6's grid pattern but with laptop requirement and two goals
// Challenge: Use while(hacking) to efficiently navigate and reach both goals

export const level9 = {
  width: 8,
  height: 7,
  start: { x: 0, y: 3 },
  goals: [{ x: 3, y: 0 }, { x: 7, y: 4 }], // Two goals to reach
  laptop: { x: 7, y: 0 }, // Laptop early in the path - need to pick it up first
  tiles: [
    // Row 0
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'goal' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }],
    // Row 1
    [{ type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }],
    // Row 2
    [{ type: 'floor' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'floor' }],
    // Row 3 - start at x:0, laptop at x:2
    [{ type: 'start' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }],
    // Row 4
    [{ type: 'floor' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'goal' }],
    // Row 5
    [{ type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }],
    // Row 6
    [{ type: 'floor' }, { type: 'floor' }, { type: 'floor' }, { type: 'void' }, { type: 'void' }, { type: 'floor' }, { type: 'floor' }, { type: 'floor' }]
  ],
  allowJump: true,
  levelNumber: 9
};

let me ={
  name: "Elis",
  surname: "frelis",
  age: 13
}
console.log(me)