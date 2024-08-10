import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ResponseGet } from '../interfaces/global.interfaces';

@Injectable({
  providedIn: 'root'
})
export class SalestypeService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/salesType';
  
  constructor(
    private http: HttpClient
  ) { }

  CCbxGetSalesTypeCombo( search: string ): Observable<ResponseGet> {
    var data = {
      search: search
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/cbxGetSalesTypeCombo`, data);
  }
}
