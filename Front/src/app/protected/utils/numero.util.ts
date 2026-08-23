// Aritmética segura para cantidades (dinero, porcentajes, piezas).
//
// En JavaScript los decimales son binarios, así que restas y sumas que
// "deberían" dar un número limpio no lo dan:
//
//   180.02 - 180        →  0.020000000000010232
//   0.1 + 0.2           →  0.30000000000000004
//
// La regla del proyecto es: **toda operación aritmética sobre cantidades
// se redondea antes de mostrarse o de compararse**, y se hace con estos
// helpers, no a mano en cada lugar.
//
// En el panel del director importa más que en ninguna otra pantalla: son
// los números que va a ver el dueño y con los que va a tomar decisiones.

// Redondea a `decimales` (2 por default: dinero).
// El +Number.EPSILON corrige el caso en que el propio valor binario queda
// un pelo por debajo del .5 y Math.round redondearía hacia abajo
// (ej. 1.005 → 1.00 en vez de 1.01).
export function fn_redondear( valor: any, decimales: number = 2 ): number {
  const n = Number(valor);
  if (!isFinite(n)) {
    return 0;
  }
  const factor = Math.pow(10, decimales);
  return Math.round((n + Number.EPSILON) * factor) / factor;
}

// Resta redondeada. Es la que evita el 0.020000000000010232: siempre que
// se reste una cantidad de otra para mostrar o comparar, va por aquí.
export function fn_restar( a: any, b: any, decimales: number = 2 ): number {
  return fn_redondear(Number(a) - Number(b), decimales);
}

// Suma redondeada, por simetría con fn_restar.
export function fn_sumar( a: any, b: any, decimales: number = 2 ): number {
  return fn_redondear(Number(a) + Number(b), decimales);
}

// Suma redondeada de una lista (acumular y redondear UNA vez al final
// arrastra menos error que redondear en cada paso).
export function fn_sumarLista( valores: any[], decimales: number = 2 ): number {
  const total = (valores || []).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0);
  return fn_redondear(total, decimales);
}

// Texto de una cantidad ya redondeada, sin ceros de relleno:
// 180 → "180", 180.5 → "180.5", 180.02 → "180.02".
export function fn_cantidadDesc( valor: any, decimales: number = 2 ): string {
  return String(fn_redondear(valor, decimales));
}

// Porcentaje que representa `parte` de `total`. Devuelve 0 sin total en
// vez de NaN o Infinity: una división entre cero no es "creció infinito",
// es que no hay base para comparar.
export function fn_porcentaje( parte: any, total: any, decimales: number = 1 ): number {
  const t = Number(total) || 0;
  if (t === 0) {
    return 0;
  }
  return fn_redondear((Number(parte) || 0) / t * 100, decimales);
}
