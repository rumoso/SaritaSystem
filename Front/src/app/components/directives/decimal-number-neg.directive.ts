import { Directive, ElementRef, HostListener } from '@angular/core';

/**
 * Misma captura numérica con hasta 2 decimales que appDecimalNumber.
 *
 * Se corrige aquí el mismo defecto: se respeta el TEXTO SELECCIONADO al
 * escribir o pegar encima. Antes la tecla se pegaba al final del valor
 * completo, así que teclear sobre una selección producía un valor con
 * más decimales de los permitidos y quedaba bloqueado.
 *
 * NOTA: pese al nombre "Neg", esta directiva NO acepta negativos — su
 * expresión regular es idéntica a la de appDecimalNumber. Se deja tal
 * cual para no cambiar el comportamiento de las pantallas que ya la
 * usan; si se quiere admitir negativos, es un cambio aparte.
 */
@Directive({
  selector: '[appDecimalNumberNeg]'
})
export class DecimalNumberNegDirective {

  // Sin el flag /g: con .test() el flag global mantiene lastIndex entre
  // llamadas y hace que la validación falle de forma intermitente.
  private regex: RegExp = new RegExp(/^\d*\.?\d{0,2}$/);
  private specialKeys: Array<string> = ['Backspace', 'Tab', 'End', 'Home', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter', 'Escape'];

  constructor(private el: ElementRef) {
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {

    if (this.specialKeys.indexOf(event.key) !== -1) {
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (event.key.length !== 1) {
      return;
    }

    if (!this.esValido(this.valorResultante(event.key))) {
      event.preventDefault();
    }

  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {

    const sPegado = event.clipboardData?.getData('text') ?? '';

    if (!this.esValido(this.valorResultante(sPegado))) {
      event.preventDefault();
    }

  }

  /** Cómo quedaría el valor si se escribe/pega `sTexto` ahora mismo. */
  private valorResultante(sTexto: string): string {

    const oInput = this.el.nativeElement as HTMLInputElement;
    const sActual: string = oInput.value ?? '';

    const iInicio = oInput.selectionStart ?? sActual.length;
    const iFin = oInput.selectionEnd ?? sActual.length;

    return sActual.slice(0, iInicio) + sTexto + sActual.slice(iFin);

  }

  private esValido(sValor: string): boolean {
    return sValor === '' || this.regex.test(sValor);
  }

}
