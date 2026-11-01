import { parse } from "acorn";

// Only this interpreter executes user scripts. It never exposes browser globals,
// prototypes, native constructors, eval, Function, or arbitrary callable values.
type Node = any;
export interface ExecutionControl {
  signal: AbortSignal;
  paused: () => boolean;
  speed: () => number;
}
export class ExecutionStopped extends Error {
  constructor() {
    super("Execution stopped. Completed writes are retained.");
  }
}
export async function executeScript(
  source: string,
  api: Record<string, unknown>,
  control: ExecutionControl,
) {
  const tree = parse(source, {
    ecmaVersion: 2022,
    sourceType: "module",
    allowAwaitOutsideFunction: true,
  });
  const allowed = new Set<Function>();
  const collect = (value: unknown) => {
    if (typeof value === "function") allowed.add(value);
    else if (value && typeof value === "object")
      Object.values(value).forEach(collect);
  };
  collect(api);
  const globals: Record<string, unknown> = {
    ...api,
    undefined,
    JSON: {
      stringify: (v: unknown, _replacer?: unknown, space?: number) =>
        JSON.stringify(v, null, space),
      parse: (v: string) => JSON.parse(v),
    },
  };
  collect(globals.JSON);
  const root = Object.assign(Object.create(null), globals);
  const bindings = new WeakMap<object, Map<string, boolean>>();
  function bind(scope: object, name: string, mutable: boolean) {
    if (!bindings.has(scope)) bindings.set(scope, new Map());
    bindings.get(scope)!.set(name, mutable);
  }
  let steps = 0;
  async function checkpoint(delay = false) {
    if (++steps > 50000)
      throw new Error("Batas 50.000 langkah tercapai. Persempit loop Anda.");
    if (control.signal.aborted) throw new ExecutionStopped();
    while (control.paused()) {
      await new Promise((r) => setTimeout(r, 30));
      if (control.signal.aborted) throw new ExecutionStopped();
    }
    if (delay || steps % 100 === 0) {
      await new Promise((r) => setTimeout(r, delay ? control.speed() : 0));
      if (control.signal.aborted) throw new ExecutionStopped();
    }
    while (control.paused()) {
      await new Promise((r) => setTimeout(r, 30));
      if (control.signal.aborted) throw new ExecutionStopped();
    }
  }
  function key(value: unknown) {
    const k = String(value);
    if (
      [
        "__proto__",
        "prototype",
        "constructor",
        "caller",
        "callee",
        "arguments",
      ].includes(k)
    )
      throw new Error(`Akses properti ${k} tidak diizinkan.`);
    return k;
  }
  async function expr(n: Node, scope: Record<string, any>): Promise<any> {
    await checkpoint();
    switch (n.type) {
      case "Literal":
        if (n.regex) throw new Error("Regular expression tidak didukung.");
        return n.value;
      case "Identifier":
        if (!(n.name in scope))
          throw new Error(`Global '${n.name}' tidak tersedia di workspace.`);
        return scope[n.name];
      case "ArrayExpression":
        return Promise.all(
          n.elements.map((e: Node) => (e ? expr(e, scope) : null)),
        );
      case "ObjectExpression": {
        const obj = Object.create(null);
        for (const p of n.properties) {
          if (p.type !== "Property" || p.kind !== "init" || p.method)
            throw new Error("Gunakan properti objek biasa.");
          obj[
            key(
              p.computed
                ? await expr(p.key, scope)
                : (p.key.name ?? p.key.value),
            )
          ] = await expr(p.value, scope);
        }
        return obj;
      }
      case "MemberExpression": {
        const object = await expr(n.object, scope);
        if (object == null)
          throw new Error("Tidak dapat membaca properti dari null.");
        const k = key(
          n.computed ? await expr(n.property, scope) : n.property.name,
        );
        if (
          k === "length" &&
          (Array.isArray(object) || typeof object === "string")
        )
          return object.length;
        return Object.hasOwn(object, k) ? object[k] : undefined;
      }
      case "AwaitExpression":
        return await expr(n.argument, scope);
      case "CallExpression": {
        const fn = await expr(n.callee, scope);
        if (typeof fn !== "function" || !allowed.has(fn))
          throw new Error("Hanya fungsi API workspace yang dapat dipanggil.");
        const args = [];
        for (const a of n.arguments) {
          if (a.type === "SpreadElement")
            throw new Error("Spread tidak didukung.");
          args.push(await expr(a, scope));
        }
        await checkpoint(true);
        return await fn(...args);
      }
      case "TemplateLiteral": {
        let text = "";
        for (let i = 0; i < n.quasis.length; i++) {
          text += n.quasis[i].value.cooked;
          if (n.expressions[i])
            text += String(await expr(n.expressions[i], scope));
        }
        return text;
      }
      case "UnaryExpression": {
        const value = await expr(n.argument, scope);
        switch (n.operator) {
          case "!":
            return !value;
          case "-":
            return -value;
          case "+":
            return +value;
          case "typeof":
            return typeof value;
          default:
            throw new Error("Operator unary tidak didukung.");
        }
      }
      case "LogicalExpression": {
        const l = await expr(n.left, scope);
        return n.operator === "&&"
          ? l
            ? expr(n.right, scope)
            : l
          : n.operator === "||"
            ? l || expr(n.right, scope)
            : (l ?? expr(n.right, scope));
      }
      case "ConditionalExpression":
        return expr(
          (await expr(n.test, scope)) ? n.consequent : n.alternate,
          scope,
        );
      case "BinaryExpression": {
        const a = await expr(n.left, scope),
          b = await expr(n.right, scope);
        switch (n.operator) {
          case "+":
            return a + b;
          case "-":
            return a - b;
          case "*":
            return a * b;
          case "/":
            return a / b;
          case "%":
            return a % b;
          case "===":
            return a === b;
          case "!==":
            return a !== b;
          case "==":
            return a == b;
          case "!=":
            return a != b;
          case "<":
            return a < b;
          case "<=":
            return a <= b;
          case ">":
            return a > b;
          case ">=":
            return a >= b;
          default:
            throw new Error(`Operator ${n.operator} tidak didukung.`);
        }
      }
      case "AssignmentExpression": {
        if (
          n.left.type !== "Identifier" ||
          n.operator !== "=" ||
          !(n.left.name in scope) ||
          n.left.name in globals
        )
          throw new Error("Hanya assignment ke variabel lokal yang diizinkan.");
        let owner = scope;
        while (!Object.hasOwn(owner, n.left.name))
          owner = Object.getPrototypeOf(owner);
        if (!bindings.get(owner)?.get(n.left.name))
          throw new Error(`Tidak dapat mengubah const '${n.left.name}'.`);
        return (owner[n.left.name] = await expr(n.right, scope));
      }
      default:
        throw new Error(
          `Sintaks ${n.type} belum didukung. Gunakan API workspace, variabel, if, atau for…of.`,
        );
    }
  }
  async function statement(n: Node, scope: Record<string, any>): Promise<void> {
    await checkpoint();
    switch (n.type) {
      case "ExpressionStatement":
        await expr(n.expression, scope);
        return;
      case "VariableDeclaration":
        for (const d of n.declarations) {
          if (d.id.type !== "Identifier" || d.id.name in globals)
            throw new Error("Gunakan nama variabel lokal yang unik.");
          scope[d.id.name] = d.init ? await expr(d.init, scope) : undefined;
          bind(scope, d.id.name, n.kind !== "const");
        }
        return;
      case "BlockStatement": {
        const child = Object.create(scope);
        for (const s of n.body) await statement(s, child);
        return;
      }
      case "IfStatement":
        if (await expr(n.test, scope)) await statement(n.consequent, scope);
        else if (n.alternate) await statement(n.alternate, scope);
        return;
      case "ForOfStatement": {
        if (
          n.left.type !== "VariableDeclaration" ||
          n.left.declarations[0].id.type !== "Identifier"
        )
          throw new Error("Gunakan for (const record of records).");
        const values = await expr(n.right, scope);
        if (!Array.isArray(values))
          throw new Error("for…of membutuhkan array.");
        for (const value of values) {
          await checkpoint(true);
          const child = Object.create(scope);
          child[n.left.declarations[0].id.name] = value;
          bind(child, n.left.declarations[0].id.name, n.left.kind !== "const");
          await statement(n.body, child);
        }
        return;
      }
      case "EmptyStatement":
        return;
      default:
        throw new Error(`Statement ${n.type} tidak didukung.`);
    }
  }
  for (const n of tree.body) await statement(n, root);
}
