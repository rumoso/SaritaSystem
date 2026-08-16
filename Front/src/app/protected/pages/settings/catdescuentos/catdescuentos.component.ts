import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { DiscountCatalogService } from 'src/app/protected/services/discount-catalog.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-catdescuentos',
  templateUrl: './catdescuentos.component.html',
  styleUrls: ['./catdescuentos.component.css']
})
export class CatdescuentosComponent implements OnInit {

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

  private _appMain: string = environment.appMain;

  title: string = 'Catálogo de descuentos';
  bShowSpinner: boolean = false;

  idUserLogON: number = 0;

  // El % NO se resta al precio: se suma al costo. Un descuento de 40%
  // deja el producto en costo * 1.40. Por eso el mínimo es 30, que es el
  // piso de negocio (costo + 30%).
  readonly PORCENTAJE_MINIMO: number = 30;

  discountForm: any = {

    idDiscountCatalog: 0,
    name: '',
    percentage: 0,
    active: true

  };

  discountList: any[] = [];

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

    , private discountServ: DiscountCatalogService

    ) { }

    async ngOnInit() {

      this.authServ.checkSession();
      this.idUserLogON = await this.authServ.getIdUserSession();

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);

      this.fn_getDiscountCatalogListWithPage();

    }

    ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {

      this.pagination = pag;
      this.fn_getDiscountCatalogListWithPage();

    }

    onChangeEvent(event: any){

      this.pagination.search = event.target.value;
      this.fn_getDiscountCatalogListWithPage();

    }
    ////************************************************ */

    hasPermissionAction( action: string ): boolean{
      return this.authServ.hasPermissionAction(action);
    }

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

fn_insertUpdateDiscountCatalog() {

  if( !this.fn_validForm() ){
    return;
  }

  const bEsEdicion = this.discountForm.idDiscountCatalog > 0;

  this.servicesGServ.showDialog('¿Estás seguro?'
  , bEsEdicion ? 'Está a punto de modificar un descuento' : 'Está a punto de agregar un descuento'
  , '¿Desea continuar?'
  , 'Si', 'No')
    .afterClosed().subscribe({
    next: ( resp: any ) =>{

      if(resp){

        this.bShowSpinner = true;

        this.discountServ.CInsertUpdateDiscountCatalog( this.discountForm )
          .subscribe({
          next: (resp: ResponseDB_CRUD) => {

            if( resp.status === 0 ){
              this.servicesGServ.showAlert('S', 'OK!', resp.message, true);
              this.event_clear();
            }
            else{
              this.servicesGServ.showAlert('W', 'Alerta!', resp.message, true);
            }

            this.bShowSpinner = false;

            this.fn_getDiscountCatalogListWithPage();

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

fn_disabledDiscountCatalog( item: any ) {

  this.servicesGServ.showDialog('¿Estás seguro?'
  , 'Está a punto de eliminar el descuento: ' + item.name
  , '¿Desea continuar?'
  , 'Si', 'No', '500px')
    .afterClosed().subscribe({
    next: ( resp: any ) =>{

      if(resp){

        this.bShowSpinner = true;

        this.discountServ.CDisabledDiscountCatalog( item.idDiscountCatalog )
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
            this.fn_getDiscountCatalogListWithPage();

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

fn_getDiscountCatalogListWithPage() {

  this.bShowSpinner = true;
  this.discountServ.CGetDiscountCatalogListWithPage( this.pagination )
  .subscribe({
    next: (resp: ResponseGet) => {

      this.discountList = resp.data.rows;
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

fn_validForm(): boolean {

  return ( this.discountForm.name || '' ).trim().length > 0
      && this.discountForm.percentage >= this.PORCENTAJE_MINIMO;

}

// Precio de ejemplo para que el usuario vea qué hace realmente el % que
// está capturando: es margen sobre costo, no un descuento sobre precio.
fn_ejemploPrecio( percentage: number ): number {
  return 100 * ( 1 + ( percentage || 0 ) / 100 );
}

fn_editData( item: any ){

  this.discountForm = {

    idDiscountCatalog: item.idDiscountCatalog,
    name: item.name,
    percentage: item.percentage,
    active: item.active == 1

  };

}

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

event_clear(){

  this.discountForm = {

    idDiscountCatalog: 0,
    name: '',
    percentage: 0,
    active: true

  };

}

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

}
