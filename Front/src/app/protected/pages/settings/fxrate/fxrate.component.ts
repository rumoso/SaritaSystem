import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { FxrateService } from 'src/app/protected/services/fxrate.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

import { PageTitleService } from 'src/app/protected/services/page-title.service';
@Component({
  selector: 'app-fxrate',
  templateUrl: './fxrate.component.html',
  styleUrls: ['./fxrate.component.css']
})
export class FxrateComponent implements OnInit {

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

  private _appMain: string = environment.appMain;

  title: string = 'Tipos de cambio';
  bShowSpinner: boolean = false;

  idUserLogON: number = 0;

  fxRateForm: any = {

    referencia: '',
    fxRate: 0

  };

  fxRatelist: any[] = [];

  //-------------------------------
  // VARIABLES PARA LA PAGINACIÓN
  iRows: number = 0;
  pagination: Pagination = {
    search:'',
    length: 10,
    pageSize: 10,
    pageIndex: 0,
    pageSizeOptions: [5, 10, 25, 100]
  }
  //-------------------------------

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

  constructor(
    private servicesGServ: ServicesGService

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService

    , private fxRateServ: FxrateService

    
    , private pageTitleServ: PageTitleService
  ) { }

  ngOnDestroy(): void {
    this.pageTitleServ.clear();
  }


    async ngOnInit() {
    this.pageTitleServ.set('currency_exchange', 'Tipos de Cambio', 'Referencias de tipo de cambio');

      this.authServ.checkSession();
      this.idUserLogON = await this.authServ.getIdUserSession();

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);

      this.fn_getFxRateListWithPage();

    }

    ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      
      this.pagination = pag;
      this.fn_getFxRateListWithPage();

    }

    onChangeEvent(event: any){
      
      this.pagination.search = event.target.value;
      this.fn_getFxRateListWithPage();

    }
    ////************************************************ */


//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

fn_insertFxRate() {

  if( this.fxRateForm.referencia.length > 0 && this.fxRateForm.fxRate > 0 ){

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Está a punto de agregar un tipo de cambio'
    , '¿Desea continuar?'
    , 'Si', 'No')
      .afterClosed().subscribe({
      next: ( resp: any ) =>{

        if(resp){

          this.bShowSpinner = true;

          this.fxRateServ.CInsertFxRate( this.fxRateForm )
            .subscribe({
            next: (resp: ResponseDB_CRUD) => {

              if( resp.status === 0 ){
                this.servicesGServ.showAlert('S', 'OK!', resp.message, true);
              }
              else{
                this.servicesGServ.showAlert('W', 'Alerta!', resp.message, true);
              }

              this.bShowSpinner = false;

              this.event_clear();

            },
            error: (ex) => {
              
              this.servicesGServ.showSnakbar( "Problemas con el servicio" );
              this.bShowSpinner = false;

            }
          })

        }
      }
    });

  }

}

fn_getFxRateListWithPage() {

  this.bShowSpinner = true;
  this.fxRateServ.CGetFxRateListWithPage( this.pagination )
  .subscribe({
    next: (resp: ResponseGet) => {
      
      this.fxRatelist = resp.data.rows;
      this.pagination.length = resp.data.count;
      this.bShowSpinner = false;

    },
    error: (ex: HttpErrorResponse) => {
      
      this.servicesGServ.showSnakbar( ex.error.data );
      this.bShowSpinner = false;

    }
  })
}





//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////








//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

event_clear(){
  this.fxRateForm.referencia = '';
  this.fxRateForm.fxRate = 0;
  this.fn_getFxRateListWithPage();
}





//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////







//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////


}
