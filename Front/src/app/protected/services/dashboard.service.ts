import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { AuthService } from 'src/app/auth/services/auth.service';
import { environment } from 'src/environments/environment';

// Panel del director (SaritaPlan/analisis/002). Un método por bloque,
// igual que en el Back: cada bloque se pide y falla por separado, para
// que uno lento o caído no deje la pantalla en blanco.

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/dashboard';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
    ) { }

  // `idUserLogON` y `fecha` van en todos: con el primero el Back resuelve
  // los dos permisos, y con el segundo el corte del panel.
  private fn_body( fecha: string, extra: any = {} ): any {
    return {
      idUserLogON: this.authServ.getIdUserSession(),
      fecha,
      ...extra
    };
  }

  CGetResumenDia( fecha: string ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getResumenDia`, this.fn_body(fecha) );
  }

  CGetResumenPorVendedor( fecha: string ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getResumenPorVendedor`, this.fn_body(fecha) );
  }

  CGetInventario( fecha: string ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getInventario`, this.fn_body(fecha) );
  }

  CGetResumenMes( fecha: string ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getResumenMes`, this.fn_body(fecha) );
  }

  CGetTendencia( fecha: string, iTop: number = 6 ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getTendencia`, this.fn_body(fecha, { iTop }) );
  }

}
