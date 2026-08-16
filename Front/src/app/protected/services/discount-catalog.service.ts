import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DiscountCatalogService {

  private baseURL: string = environment.baseUrl;
  private idSucursal: number = environment.idSucursal;

  _api: string = 'api/discountCatalog';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
  ) { }

  CGetDiscountCatalogListWithPage( pagination: Pagination ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getDiscountCatalogListWithPage`, data);

  }

  CInsertUpdateDiscountCatalog( data : any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertUpdateDiscountCatalog`, data );
  }

  CDisabledDiscountCatalog( idDiscountCatalog : number ): Observable<ResponseDB_CRUD> {

    const data: any = {
      idDiscountCatalog: idDiscountCatalog
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/disabledDiscountCatalog`, data );
  }

  CCbxGetDiscountCatalogCombo( search: string = '' ): Observable<ResponseGet> {

    const data = {
      search: search
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/cbxGetDiscountCatalogCombo`, data);
  }

}
