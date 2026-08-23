import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { DashboardService } from 'src/app/protected/services/dashboard.service';
import { PageTitleService } from 'src/app/protected/services/page-title.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { fn_redondear } from '../../utils/numero.util';

// Panel del director (SaritaPlan/analisis/002): la situación del negocio
// en una pantalla, sin capturar filtros.
//
// Es una pantalla APARTE del dashboard de inicio. Ese sigue siendo el
// lanzador de menús para todos; este vive en su propia ruta para que el
// acceso lo controle su permiso (`dashboard_VerPanel`) en vez de
// aparecerle a cualquiera que entre al sistema.

// Estado de un bloque del panel. Cada uno vive por su cuenta: es lo que
// permite que un bloque lento o caído no tumbe a los otros cuatro.
interface BloqueEstado {
  bCargando: boolean;
  bError: boolean;
  data: any;
}

@Component({
  selector: 'app-dashboard-director',
  templateUrl: './dashboard-director.component.html',
  styleUrls: ['./dashboard-director.component.css']
})
export class DashboardDirectorComponent implements OnInit, OnDestroy {

  private _appMain: string = environment.appMain;

  idUserLogON: number = 0;

  // Fecha del corte. Se puede mover con el selector — es también la
  // precondición de la demo: la copia local tiene su última venta el
  // 15-ago-2026, así que abierta en "hoy" contra esa base los bloques del
  // día salen vacíos. La respuesta correcta es mover el corte o apuntar a
  // producción, NUNCA meterle datos falsos al panel.
  fechaCorte: string = '';

  dia: BloqueEstado = this.fn_bloqueVacio();
  vendedores: BloqueEstado = this.fn_bloqueVacio();
  inventario: BloqueEstado = this.fn_bloqueVacio();
  mes: BloqueEstado = this.fn_bloqueVacio();
  tendencia: BloqueEstado = this.fn_bloqueVacio();

  // Sello de frescura. El panel se refresca solo cada 60 s y lo dice,
  // para que nadie tome una decisión con un número de hace media hora
  // creyendo que es de ahorita.
  ultimaActualizacion: Date | null = null;
  sDesdeActualizacion: string = '';

  private _idRefresco: any = null;
  private _idReloj: any = null;

  constructor(
    private servicesGServ: ServicesGService
    , private authServ: AuthService
    , private dashboardServ: DashboardService
    , private pageTitleServ: PageTitleService
  ) { }

  ngOnInit(): void {

    this.authServ.checkSession();
    this.idUserLogON = this.authServ.getIdUserSession();

    this.pageTitleServ.set( 'insights', 'Panel del director', 'La situación del negocio en una pantalla' );

    this.fechaCorte = this.fn_hoy();

    this.fn_cargarTodo();

    // Refresco automático. 60 s es suficiente para que el panel se sienta
    // vivo sin castigar la BD: el negocio no cambia de minuto a minuto.
    this._idRefresco = setInterval(() => {
      // No se refresca con la pestaña oculta: sería gastar consultas para
      // nadie, y al volver se recarga de todos modos.
      if( !document.hidden ){
        this.fn_cargarTodo();
      }
    }, 60000);

    // Reloj del "actualizado hace X". Va aparte del refresco porque el
    // texto tiene que avanzar cada segundo aunque los datos solo se pidan
    // cada minuto.
    this._idReloj = setInterval(() => this.fn_actualizarSello(), 1000);

  }

  // Sin esto el panel sigue consultando en segundo plano después de salir
  // de la pantalla, una vez por minuto, para siempre.
  ngOnDestroy(): void {

    this.pageTitleServ.clear();

    if( this._idRefresco ){
      clearInterval( this._idRefresco );
      this._idRefresco = null;
    }
    if( this._idReloj ){
      clearInterval( this._idReloj );
      this._idReloj = null;
    }

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // CARGA DE BLOQUES
  //////////////////////////////////////////////////////////////////////////////////////////////////

  private fn_bloqueVacio(): BloqueEstado {
    return { bCargando: true, bError: false, data: null };
  }

  private fn_hoy(): string {
    const d = new Date();
    return `${ d.getFullYear() }-${ String(d.getMonth() + 1).padStart(2, '0') }-${ String(d.getDate()).padStart(2, '0') }`;
  }

  // Carga un bloque aislando su error: si este truena, los demás ni se
  // enteran.
  private fn_cargarBloque( bloque: BloqueEstado, obs: any ): void {

    bloque.bCargando = true;
    bloque.bError = false;

    obs.subscribe({
      next: ( resp: any ) => {
        bloque.bCargando = false;
        if( resp && resp.status === 0 ){
          bloque.data = resp.data;
        }else{
          bloque.bError = true;
        }
      },
      error: () => {
        bloque.bCargando = false;
        bloque.bError = true;
      }
    });

  }

  fn_cargarTodo(): void {

    const f = this.fechaCorte;

    this.fn_cargarBloque( this.dia, this.dashboardServ.CGetResumenDia(f) );
    this.fn_cargarBloque( this.vendedores, this.dashboardServ.CGetResumenPorVendedor(f) );
    this.fn_cargarBloque( this.inventario, this.dashboardServ.CGetInventario(f) );
    this.fn_cargarBloque( this.mes, this.dashboardServ.CGetResumenMes(f) );
    this.fn_cargarBloque( this.tendencia, this.dashboardServ.CGetTendencia(f) );

    this.ultimaActualizacion = new Date();
    this.fn_actualizarSello();

  }

  // Reintento de un solo bloque, sin tocar los demás.
  fn_reintentar( sBloque: string ): void {

    const f = this.fechaCorte;

    switch( sBloque ){
      case 'dia':        this.fn_cargarBloque( this.dia, this.dashboardServ.CGetResumenDia(f) ); break;
      case 'vendedores': this.fn_cargarBloque( this.vendedores, this.dashboardServ.CGetResumenPorVendedor(f) ); break;
      case 'inventario': this.fn_cargarBloque( this.inventario, this.dashboardServ.CGetInventario(f) ); break;
      case 'mes':        this.fn_cargarBloque( this.mes, this.dashboardServ.CGetResumenMes(f) ); break;
      case 'tendencia':  this.fn_cargarBloque( this.tendencia, this.dashboardServ.CGetTendencia(f) ); break;
    }

  }

  ev_fn_cambiarFecha(): void {
    if( this.fechaCorte ){
      this.fn_cargarTodo();
    }
  }

  private fn_actualizarSello(): void {

    if( !this.ultimaActualizacion ){
      this.sDesdeActualizacion = '';
      return;
    }

    const iSeg = Math.floor( ( Date.now() - this.ultimaActualizacion.getTime() ) / 1000 );

    if( iSeg < 60 ){
      this.sDesdeActualizacion = `hace ${ iSeg } s`;
    }else{
      const iMin = Math.floor( iSeg / 60 );
      this.sDesdeActualizacion = `hace ${ iMin } min`;
    }

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // HELPERS DE PRESENTACIÓN
  //////////////////////////////////////////////////////////////////////////////////////////////////

  // Ancho de barra relativo al mayor de una lista. Se calcula aquí y no
  // en el template para no meter aritmética en el HTML.
  fn_ancho( valor: any, valores: any[] ): number {

    const max = Math.max( ...(valores || []).map( (v: any) => Math.abs(Number(v) || 0) ), 0 );

    if( max <= 0 ){
      return 0;
    }

    return fn_redondear( Math.abs(Number(valor) || 0) / max * 100, 1 );

  }

  fn_anchoVendedor( valor: any ): number {
    const d = this.vendedores.data;
    if( !d ){ return 0; }
    // Se mide contra la misma columna con la que está ordenada la tabla:
    // con permiso de costos, la utilidad; sin él, el importe vendido.
    return this.fn_ancho( valor, d.rows.map( (r: any) => ( d.bVerCostos ? r.utilidad : r.vendido ) ) );
  }

  // Ojo con el guard: cuando falta `dashboard_VerCostos` el servidor
  // manda `{ bSinPermiso: true }` — `data` viene con contenido pero sin
  // `cubetas`, así que preguntar solo por `data` no alcanza.
  fn_anchoCubeta( costo: any ): number {
    const d = this.inventario.data;
    return this.fn_ancho( costo, d && d.cubetas ? d.cubetas.map( (c: any) => c.costo ) : [] );
  }

  fn_anchoFormaPago( monto: any ): number {
    const d = this.dia.data;
    return this.fn_ancho( monto, d ? d.formasPago.map( (f: any) => f.monto ) : [] );
  }

  fn_anchoDiaria( vendido: any ): number {
    const d = this.mes.data;
    return this.fn_ancho( vendido, d ? d.diaria.map( (x: any) => x.vendido ) : [] );
  }

  fn_anchoHora( notas: any ): number {
    const d = this.tendencia.data;
    return this.fn_ancho( notas, d ? d.ritmo.horas.map( (h: any) => h.notas ) : [] );
  }

  // Las dos listas de tendencia se miden contra la MISMA escala (el mayor
  // movimiento de las dos), si no un "+12" se vería igual de largo que un
  // "-380" y la gráfica mentiría.
  fn_anchoTendencia( delta: any ): number {
    const d = this.tendencia.data;
    if( !d ){ return 0; }
    const todos = [ ...d.productos.suben, ...d.productos.bajan ].map( (p: any) => p.delta );
    return this.fn_ancho( delta, todos );
  }

  fn_anchoDiaSemana( notasPorDia: any ): number {
    const d = this.tendencia.data;
    return this.fn_ancho( notasPorDia, d ? d.ritmo.diasSemana.map( (x: any) => x.notasPorDia ) : [] );
  }

  fn_anchoEstatusTaller( folios: any ): number {
    const d = this.tendencia.data;
    return this.fn_ancho( folios, d ? d.taller.estatus.map( (e: any) => e.folios ) : [] );
  }

  // Color de una variación. El cero es su propio caso: "igual que la
  // semana pasada" no es ni bueno ni malo.
  fn_claseVariacion( v: any ): string {
    if( v === null || v === undefined ){
      return 'dbp-var--neutro';
    }
    const n = Number(v);
    if( n > 0 ) return 'dbp-var--sube';
    if( n < 0 ) return 'dbp-var--baja';
    return 'dbp-var--neutro';
  }

  fn_variacionDesc( v: any ): string {
    if( v === null || v === undefined ){
      return 'sin base para comparar';
    }
    const n = fn_redondear( v, 1 );
    return `${ n > 0 ? '+' : '' }${ n }%`;
  }

  fn_puntosDesc( v: any ): string {
    const n = fn_redondear( v, 1 );
    return `${ n > 0 ? '+' : '' }${ n } pp`;
  }

  fn_deltaDesc( v: any ): string {
    const n = fn_redondear( v, 0 );
    return `${ n > 0 ? '+' : '' }${ n }`;
  }

  // Día de la semana + día del mes para el eje de la gráfica.
  fn_diaCorto( sFecha: any ): string {

    if( !sFecha ){
      return '';
    }

    const d = new Date( `${ String(sFecha).substring(0, 10) }T12:00:00` );
    const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

    return `${ dias[ d.getDay() ] } ${ d.getDate() }`;

  }

  // "1 al 14 de agosto" para rotular los comparativos del mes: sin el
  // rango, "vs. julio" se lee como el mes completo y no lo es.
  fn_rangoDesc( sDesde: any, sHasta: any ): string {

    if( !sDesde || !sHasta ){
      return '';
    }

    const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    const dIni = new Date( `${ String(sDesde).substring(0, 10) }T12:00:00` );
    const dFin = new Date( `${ String(sHasta).substring(0, 10) }T12:00:00` );

    return `${ dIni.getDate() } al ${ dFin.getDate() } de ${ MESES[ dFin.getMonth() ] } ${ dFin.getFullYear() }`;

  }

  fn_horaDesc( iHora: any ): string {
    return `${ String( Number(iHora) || 0 ).padStart(2, '0') }:00`;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // NAVEGACIÓN
  //
  // Un listado que no se puede accionar no sirve: del inventario se va al
  // catálogo de productos y del día a la consulta de ventas.
  //////////////////////////////////////////////////////////////////////////////////////////////////

  private changeRoute( route: string ): void {
    this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
  }

  fn_irAVentas(): void {
    this.changeRoute( 'saleList' );
  }

  fn_irAProductos(): void {
    this.changeRoute( 'productList' );
  }

  fn_irACortes(): void {
    this.changeRoute( 'cortesCaja' );
  }

}
