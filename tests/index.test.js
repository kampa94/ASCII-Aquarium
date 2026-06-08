import * as indexFn from "../src/index.js";
import { jest } from "@jest/globals";
import expect from "expect";
import {createBubble, createFood, createShark, createState} from "../src/index.js";

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

describe('Aquarium Simulation - Unit Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset di process.stdout per controllare le dimensioni dello schermo
    Object.defineProperty(process.stdout, 'columns', { value: 80, writable: true });
    Object.defineProperty(process.stdout, 'rows', { value: 24, writable: true });
  });

  // --- TEST FOR CREATEBUBBLE ---
  describe('createBubble', () => {
    it('dovrebbe generare una bolla con le proprietà corrette e valori numerici', () => {
      const bubble = createBubble(80, 24);

      expect(bubble).toEqual(expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
        vx: expect.any(Number),
        vy: expect.any(Number),
        age: 0,
        ttl: expect.any(Number),
        glyph: expect.any(String)
      }));
    });
  });

  // --- TEST FOR CREATEFOOD ---
  describe('createFood', () => {
    it('dovrebbe generare cibo entro i limiti di larghezza dello schermo', () => {
      const width = 100;
      const food = createFood(width);

      expect(food).toEqual(expect.objectContaining({
        x: expect.any(Number),
        y: 2,
        vy: expect.any(Number),
        life: 0,
        sparkle: expect.any(Number)
      }));

      expect(food.x).toBeGreaterThanOrEqual(4);
      expect(food.x).toBeLessThanOrEqual(width);
    });
  });

  // --- TEST FOR CREATESHARK ---
  describe('createShark', () => {
    it('dovrebbe orientare lo squalo a destra o a sinistra correttamente', () => {
      // Mock Math.random per forzare la direzione a DESTRA (dir: 1)
      jest.spyOn(Math, 'random').mockReturnValue(0.6);
      const sharkRight = createShark(80, 24);
      expect(sharkRight.dir).toBe(1);
      expect(sharkRight.body).toContain('___)))>');
      expect(sharkRight.vx).toBeGreaterThan(0);

      // Mock Math.random per forzare la direzione a SINISTRA (dir: -1)
      Math.random.mockReturnValue(0.4);
      const sharkLeft = createShark(80, 24);
      expect(sharkLeft.dir).toBe(-1);
      expect(sharkLeft.body).toContain('<=======(((___    /\\    ');
      expect(sharkLeft.vx).toBeLessThan(0);
    });
  });

  // --- TEST FOR CREATESTATE ---
  describe('createState', () => {
    it('dovrebbe inizializzare lo stato globale con i valori di default corretti', () => {
      const state = createState();

      expect(state).toHaveProperty('clock', 0);
      expect(state).toHaveProperty('lightingMode', 'auto');
      expect(state).toHaveProperty('showHud', true);
      expect(state).toHaveProperty('foods', []);
      expect(state).toHaveProperty('shark', null);
      expect(state.fish.length).toBeGreaterThan(0);
      expect(state.bubbles.length).toBeGreaterThan(0);
    });

    it('dovrebbe calcolare le dimensioni minime di sicurezza se la console è troppo piccola', () => {
      process.stdout.columns = 10;
      process.stdout.rows = 5;

      const state = createState();
      // Verifica i limiti Math.max(60, ...) e Math.max(18, ...)
      expect(state.width).toBe(60);
      expect(state.height).toBe(18);
    });

    it('dovrebbe scalare il numero di pesci e bolle in base alla larghezza dello schermo', () => {
      process.stdout.columns = 120;
      const stateGrande = createState();

      process.stdout.columns = 60;
      const statePiccolo = createState();

      expect(stateGrande.fish.length).toBeGreaterThanOrEqual(statePiccolo.fish.length);
      expect(stateGrande.bubbles.length).toBeGreaterThanOrEqual(statePiccolo.bubbles.length);
    });
  });
});