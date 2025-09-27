// src/game/tankDefs.js
// 戦車テンプレート一覧（必要なら値を増やして）

export const TANKS = [
  {
    id: "type4_H",
    name: "Pz.IV H",
    attack: 155,             
    range: 5,
    armorFront: 80,
    armorSide: 30,
    armorRear: 20,
    actionsPerTurn: 4,
    malfunctionProb: 0.08
  },
  {
    id: "churchill_mk7",
    name: "Churchill Mk. VII",
    attack: 120,
    range: 4,
    armorFront: 152,
    armorSide: 95,
    armorRear: 51,
    actionsPerTurn: 2,
    malfunctionProb: 0.05
  },
  {
    id: "M4_sherman",
    name: "M4 Sherman",
    attack: 130,
    range: 5,
    armorFront: 50,
    armorSide: 38,
    armorRear: 38,
    actionsPerTurn: 4,   
    malfunctionProb: 0.01
  },
  {
    id: "P40",
    name: "P40",
    attack: 100,
    range: 5,
    armorFront: 50,
    armorSide: 45,
    armorRear: 40,
    actionsPerTurn: 4,
    malfunctionProb: 0.12
  },
  {
    id: "t34_85",
    name: "T-34/85",
    attack: 170,
    range: 6,
    armorFront: 45,
    armorSide: 44,
    armorRear: 40,
    actionsPerTurn: 5,
    malfunctionProb: 0.10
  },
  {
    id: "Tiger_1",
    name: "Tiger I",
    attack: 185,
    range: 6,
    armorFront: 102,
    armorSide: 85,
    armorRear: 82,
    actionsPerTurn: 4,
    malfunctionProb: 0.15
  },
    {
    id: "Tiger_2",
    name: "Tiger II",
    attack: 200,
    range: 8,
    armorFront: 150,
    armorSide: 80,
    armorRear: 80,
    actionsPerTurn: 4,
    malfunctionProb: 0.20
  },
  {
    id: "Maus",
    name: "Maus",
    attack: 500,
    range: 10,
    armorFront: 200,
    armorSide: 180,
    armorRear: 150,
    actionsPerTurn: 2,
    malfunctionProb: 0.30
  },
  {
    id: "Type_97 Chi_Ha",
    name: "Type 97 Chi-Ha",
    attack: 75,
    range: 3,
    armorFront: 25,
    armorSide: 25,
    armorRear: 20,
    actionsPerTurn: 3,
    malfunctionProb: 0.08
  },
  {
    id: "ARL44",
    name: "ARL44",
    attack: 240,
    range: 5,
    armorFront: 120,
    armorSide: 50,
    armorRear: 35,
    actionsPerTurn: 4,
    malfunctionProb: 0.20
  },
  {
    id: "BT-42",
    name: "BT-42",
    attack: 55,
    range: 2,
    armorFront: 20,
    armorSide: 15,
    armorRear: 13,
    actionsPerTurn: 7,
    malfunctionProb: 0.11
  }
];