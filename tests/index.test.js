import * as indexFn from "../src/index.js";
import { jest } from "@jest/globals";

describe("Funzioni di Utilità e Matematica", () => {
  test("dovrebbe limitare i valori entro il range", () => {
    expect(indexFn.clamp(5, 0, 10)).toBe(5);
    expect(indexFn.clamp(-1, 0, 10)).toBe(0);
    expect(indexFn.clamp(15, 0, 10)).toBe(10);
  });

  test("dovrebbe restituire gli stessi valori se la magnitudo è minore del massimo", () => {
    expect(indexFn.limitMagnitude(3, 4, 10)).toEqual([3, 4]);
  });

  test("dovrebbe restituire gli stessi valori se la magnitudo è uguale al massimo", () => {
    expect(indexFn.limitMagnitude(3, 4, 5)).toEqual([3, 4]);
  });

  test("dovrebbe scalare i valori se la magnitudo supera il massimo", () => {
    expect(indexFn.limitMagnitude(6, 8, 5)).toEqual([3, 4]);
  });
});
describe("Forme ASCII", () => {
  test("dovrebbe restituire una stringa vuota se l'input è vuoto", () => {
    expect(indexFn.mirrorShape("")).toBe("");
  });

  test("dovrebbe specchiare i singoli caratteri di apertura e chiusura", () => {
    expect(indexFn.mirrorShape("<")).toBe(">");
    expect(indexFn.mirrorShape(">")).toBe("<");
    expect(indexFn.mirrorShape("(")).toBe(")");
    expect(indexFn.mirrorShape(")")).toBe("(");
    expect(indexFn.mirrorShape("[")).toBe("]");
    expect(indexFn.mirrorShape("]")).toBe("[");
    expect(indexFn.mirrorShape("{")).toBe("}");
    expect(indexFn.mirrorShape("}")).toBe("{");
    expect(indexFn.mirrorShape("/")).toBe("\\");
    expect(indexFn.mirrorShape("\\")).toBe("/");
  });

  test("dovrebbe mantenere invariati i caratteri non presenti nella mappa", () => {
    expect(indexFn.mirrorShape("A")).toBe("A");
    expect(indexFn.mirrorShape("123")).toBe("321");
    expect(indexFn.mirrorShape("abc!")).toBe("!cba");
  });

  test("dovrebbe invertire e specchiare correttamente stringhe complesse", () => {
    expect(indexFn.mirrorShape("->")).toBe("<-");
    expect(indexFn.mirrorShape("([{}])")).toBe("([{}])");
    expect(indexFn.mirrorShape("/\\")).toBe("/\\");
  });
  test("dovrebbe gestire correttamente gli spazi vuoti", () => {
    expect(indexFn.mirrorShape("(  [  )")).toBe("(  ]  )");
  });
});
describe("createSeaweed", () => {
  beforeEach(() => {
    global.SEAWEED_SPACING = 5;
    global.rand = jest.fn((min, max) => min);
    global.pick = jest.fn((arr) => arr[0]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("dovrebbe calcolare correttamente floorY basandosi sulla formula height - 2", () => {
    const result = indexFn.createSeaweed(20, 10);
    expect(result.floorY).toBe(8);
  });

  test("dovrebbe limitare floorY a un minimo di 3 per altezze molto piccole", () => {
    const result = indexFn.createSeaweed(20, 4);
    expect(result.floorY).toBe(3);
  });

  test("dovrebbe restituire un array vuoto se la larghezza è insufficiente", () => {
    const result = indexFn.createSeaweed(8, 10);
    expect(result.stalks).toEqual([]);
  });

  test("dovrebbe popolare la struttura dati del gambo con i valori corretti", () => {
    global.rand = jest
      .fn()
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(1.5)
      .mockReturnValueOnce(1.2);
    global.pick = jest.fn().mockReturnValue("/");

    const result = indexFn.createSeaweed(10, 10);
    const stalk = result.stalks[0];

    expect(stalk.x).toEqual(4);
    expect(stalk.height).toEqual(3);
  });
});

describe("indexFn.createFish", () => {
  beforeEach(() => {
    global.RIGHT_SHAPES = ["<><"];
    global.PERSONALITIES = ["normal", "darty", "lazy"];

    global.pick = jest.fn((arr) => arr[0]);
    global.rand = jest.fn((min, max) => min);

    jest.spyOn(Math, "random").mockReturnValue(0.6);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("dovrebbe generare un pesce con valori di default coerenti quando non si passano opzioni", () => {
    global.pick.mockReturnValueOnce("><>").mockReturnValueOnce("normal");

    global.rand
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(4)
      .mockReturnValueOnce(1.2)
      .mockReturnValueOnce(0.3)
      .mockReturnValueOnce(0.02)
      .mockReturnValueOnce(150)
      .mockReturnValueOnce(1.1)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(-0.5)
      .mockReturnValueOnce(0.5);

    const fish = indexFn.createFish(50, 20);

    expect(fish.shape).toBe(">==>");
    expect(fish.dir).toBe(1);
    expect(fish.personality).toBe("lazy");
    expect(fish.speedBase).toBe(7.1);
    expect(fish.vx).toBe(7.1);
    expect(fish.age).toBe(0);
  });

  test("dovrebbe impostare dir a -1 se Math.random() è inferiore o uguale a 0.5", () => {
    Math.random.mockReturnValue(0.4);
    const fish = indexFn.createFish(50, 20);
    expect(fish.dir).toBe(-1);
  });

  test("dovrebbe rispettare i valori passati tramite l'oggetto options", () => {
    const options = {
      dir: -1,
      depth: 0.8,
      x: 15,
      y: 12,
    };

    const fish = indexFn.createFish(50, 20, options);

    expect(fish.dir).toBe(-1);
    expect(fish.depth).toBe(0.8);
    expect(fish.x).toBe(15);
    expect(fish.y).toBe(12);

    expect(fish.vx).toBeLessThan(0);
  });
});
