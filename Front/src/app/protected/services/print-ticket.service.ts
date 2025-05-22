import { Injectable } from '@angular/core';
import { SucursalesService } from './sucursales.service';
import { Observable, async } from 'rxjs';
import { SalesService } from './sales.service';
import { CustomersService } from './customers.service';
import { ResponseGet } from '../interfaces/global.interfaces';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { CajasService } from './cajas.service';
import { PrintersService } from './printers.service';
import { ProductsService } from './products.service';

@Injectable({
  providedIn: 'root'
})
export class PrintTicketService {

  _api: string = 'http://localhost/printT/Print';

  constructor(
    private http: HttpClient
    , private sucursalesServ: SucursalesService
    , private salesServ: SalesService
    , private customersServ: CustomersService
    , private servicesG: ServicesGService
    , private cajasServ: CajasService
    , private printersServ: PrintersService
    , private productsServ: ProductsService
  ) { }

  async printTicket( type: string, idRelation: any, idPrinter: number, iCopy: number, iPayments: number = 0, idPayment: any = '', sumCambio: number = 0 ): Promise<any> {

    var bOK = false;
    var sBarCode = '';

    let USDollar = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    });

    var oLinesP: any = [];

    if(type == "Venta"){

      const sale = await this.salesServ.CGetSaleByIDPromise( idRelation );

      console.log(sale);

      // CONSTRUYO EL HEADER
      const HeaderSuc = await this.sucursalesServ.CGetPrintTicketSuc( sale.data.idSucursal, "Header");

      var oLines: any = [];

      oLines = [];
      var oLine: any = { bImage: true, base64Image: this.base64VioletaIcon, iHeight: this.iHeightLogo, ticketWidth: this.ticketWidth }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );


      // oLines = [];
      // var oLine: any = { aling: "Left", size: 7, text: "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNO" }
      // oLines.push( oLine );
      // oLinesP.push( { oLines: oLines } );

      // oLines = [];
      // var oLine: any = { aling: "Left", size: 7, text: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcd" }
      // oLines.push( oLine );
      // oLinesP.push( { oLines: oLines } );

      // oLines = [];
      // var oLine: any = { aling: "Left", size: 7, text: "12345678901234567890123456789012345678901234567890" }
      // oLines.push( oLine );
      // oLinesP.push( { oLines: oLines } );



      oLines = [];
      var oLine: any = { aling: "Center", size: 15, text: "NOTA: " + sale.data.saleTypeDesc }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 15, text: "Folio: #" + sale.data.idSale }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      if( sale.data.fechaEntrega ){
        oLines = [];
        var oLine: any = { aling: "Center", size: 15, text: "Fecha de entrega: " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 15, text: sale.data.fechaEntrega }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      if( sale.data.statusSobreDesc == 'Entregado' ){

        oLines = [];
        var oLine: any = { aling: "Center", size: 15, text: "ENTREGADO" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      if(sale.data.active == 0){

        oLines = [];
        var oLine: any = { aling: "Center", size: 20, text: "CANCELADA" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      oLines = [];
      var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      for(var i = 0; i < HeaderSuc.length; i++){

        oLines = [];

        var oLine: any = {
          aling: HeaderSuc[i].aling
          , size: HeaderSuc[i].size
          , text: HeaderSuc[i].text
        }

        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      // AGREGO LA INFORMACIÓN DEL CLIENTE
      const OCustomerData = await this.customersServ.CGetCustomerByIDPromise( sale.data.idCustomer );

      if( OCustomerData != null ){

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "CLIENTE: " + OCustomerData.lastName + " " + OCustomerData.name }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "DIRECCIÓN: " + OCustomerData.address }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "TELEFONO: " + OCustomerData.tel }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      // AGREGO LA INFORMACIÓN DELA OPERACIÓN
      if( sale != null ){

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "OPERACIÓN: Venta de " + sale.data.saleTypeDesc }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "Folio: #" + sale.data.idSale }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "FECHA: " + sale.data.createDateString }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "ATENDIÓ: " + sale.data.sellerDesc }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }

      if( sale.data.idSaleType == 5 ){

        oLines = [];
        var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "DESCRIPCIÓN", iWith: 100 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        for(var i = 0; i < sale.dataDetail.length; i++){

          var ODataDetail = sale.dataDetail[i];

          oLines = [];
          var oLine: any = { aling: "Left", size: 7, text: ODataDetail.productDesc, iWith: 100 }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

        }

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }else{

        oLines = [];
        var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "DESCRIPCIÓN", iWith: 42 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 5, style: "Bold", text: "CAN", iWith: 8 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 5, style: "Bold", text: "PRECIO", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 5, style: "Bold", text: "IMPORTE", iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        for(var i = 0; i < sale.dataDetail.length; i++){

          var ODataDetail = sale.dataDetail[i];

          oLines = [];
          var oLine: any = { aling: "Left", size: 7, text: ODataDetail.barCode + '-' + ODataDetail.productDesc, iWith: 42 }
          oLines.push( oLine );
          var oLine: any = { aling: "Center", size: 7, text: ODataDetail.cantidad, iWith: 8 }
          oLines.push( oLine );
          var oLine: any = { aling: "Right", size: 7, text: USDollar.format( ODataDetail.precio ), iWith: 25 }
          oLines.push( oLine );
          var oLine: any = { aling: "Right", size: 7, text: USDollar.format( ODataDetail.importe ), iWith: 25 }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

        }

      }

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: "SUBTOTAL:", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( sale.data.saleTotal ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: "IVA:", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( 0 ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: "TOTAL:", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( sale.data.saleTotal ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      //SI ES DE CONSIGNACIÓN, DEBE FIRMAR EL CLIENTE
      if(sale.data.idSaleType == 4 || sale.data.idSaleType == 1){

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "---------------------------------------------------- " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "CLIENTE: " + OCustomerData.lastName + " " + OCustomerData.name }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }

      if( sale.data.idSaleType == 6 ){

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "EL PRECIO Y LAS CONDICIONES PUEDEN VARIAR SI SE PRESENTAN CAMBIOS EN LAS CARACTERÍSTICAS DEL PRODUCTO O SERVICIO EN UN PLAZO DE 7 DÍAS, O EN FUNCIÓN DE LA DISPONIBILIDAD. POR FAVOR, CONFIRME LA DISPONIBILIDAD Y PRECIO ANTES DE REALIZAR SU PEDIDO." }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "CONSERVE SU TICKET PARA ACLARACIONES" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }else{

        // CONSTRUYO EL FOOTER
        const FooterSuc = await this.sucursalesServ.CGetPrintTicketSuc( sale.data.idSucursal, "footer");

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        for(var i = 0; i < FooterSuc.length; i++){

          oLines = [];

          var oLine: any = {
            aling: FooterSuc[i].aling
            , size: FooterSuc[i].size
            , text: FooterSuc[i].text
          }

          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );
        }

      }

    }
    else if(type == "Payments" || type == "RePayment"){

      const sale = await this.salesServ.CGetSaleByIDPromise( idRelation );

      console.log(sale);

      // CONSTRUYO EL HEADER
      const HeaderSuc = await this.sucursalesServ.CGetPrintTicketSuc( sale.data.idSucursal, "Header");

      var oLines: any = [];

      oLines = [];
      var oLine: any = { bImage: true, base64Image: this.base64VioletaIcon, iHeight: this.iHeightLogo, ticketWidth: this.ticketWidth }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 20, text: "PAGO" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      for(var i = 0; i < HeaderSuc.length; i++){

        oLines = [];

        var oLine: any = {
          aling: HeaderSuc[i].aling
          , size: HeaderSuc[i].size
          , text: HeaderSuc[i].text
        }

        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      // AGREGO LA INFORMACIÓN DEL CLIENTE
      const OCustomerData = await this.customersServ.CGetCustomerByIDPromise( sale.data.idCustomer );

      if( OCustomerData != null ){

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "CLIENTE: " + OCustomerData.lastName + " " + OCustomerData.name }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "DIRECCIÓN: " + OCustomerData.address }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "TELEFONO: " + OCustomerData.tel }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      // AGREGO LA INFORMACIÓN DELA OPERACIÓN
      if( sale != null ){

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "OPERACIÓN: "
        + ( sale.data.idSaleType == "1" ? "Abono al crédito #" : sale.data.idSaleType == "2" ? "Pago de la venta #" : sale.data.idSaleType == "3" ? "Abono al apartado #" : "Pago al #" ) +  sale.data.idSale }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "FECHA: " + sale.dataPayments[0].createDateString }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "ATENDIÓ: " + sale.data.sellerDesc }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "# PAGO", iWith: 25 }
      oLines.push( oLine );
      var oLine: any = { aling: "Center", size: 5, style: "Bold", text: "FORMA DE PAGO", iWith: 45 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 5, style: "Bold", text: "PAGO", iWith: 30 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      var dataPayments = [];

      if(type == "RePayment"){
        dataPayments = sale.dataPayments.filter( ( item: any ) => item.idPayment === idPayment);
      }
      else{
        dataPayments = sale.dataPayments;
      }

      for(var i = 0; i < iPayments; i++){

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: dataPayments[i].idPayment, iWith: 20 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, text: ( dataPayments[i].fxRate > 0 ?
          dataPayments[i].formaPagoDesc + '(' + USDollar.format( dataPayments[i].pagoF ) + ')'
          : dataPayments[i].formaPagoDesc ), iWith: 50 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, text: USDollar.format( dataPayments[i].pago ), iWith: 30 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }

      oLines = [];
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: "PAGADO:", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( sale.data.pagado ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: "PENDIENTE:", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( sale.data.pendingAmount ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: "CAMBIO:", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( sumCambio ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      if(sale.data.pendingAmount <= 0){
        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 20, text: "PAGADO" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      // CONSTRUYO EL FOOTER
      // const FooterSuc = await this.sucursalesServ.CGetPrintTicketSuc( sale.data.idSucursal, "footer");

      // oLines = [];
      // var oLine: any = { aling: "Left", size: 7, text: " " }
      // oLines.push( oLine );
      // oLinesP.push( { oLines: oLines } );

      // for(var i = 0; i < FooterSuc.length; i++){

      //   oLines = [];

      //   var oLine: any = {
      //     aling: FooterSuc[i].aling
      //     , size: FooterSuc[i].size
      //     , text: FooterSuc[i].text
      //   }

      //   oLines.push( oLine );
      //   oLinesP.push( { oLines: oLines } );
      // }

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 7, text: "GRACIAS POR SU PAGO" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );
      oLines = [];
      var oLine: any = { aling: "Center", size: 7, text: "CONSERVE SU TICKET PARA ACLARACIONES" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

    }
    else if(type == "CorteCaja"){

      var idCorteCaja = idRelation;

      const oCorteCaja = await this.salesServ.CGetCorteCajaByIDPromise( idCorteCaja );

      console.log( oCorteCaja )

      const HeaderSuc = await this.sucursalesServ.CGetPrintTicketSuc( oCorteCaja.data.idSucursal, "Header");

      var oLines: any = [];

      oLines = [];
      var oLine: any = { bImage: true, base64Image: this.base64VioletaIcon, iHeight: this.iHeightLogo, ticketWidth: this.ticketWidth }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 20, text: "CORTE DE CAJA" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      for(var i = 0; i < HeaderSuc.length; i++){

        oLines = [];

        var oLine: any = {
          aling: HeaderSuc[i].aling
          , size: HeaderSuc[i].size
          , text: HeaderSuc[i].text
        }

        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }


      if( oCorteCaja != null ){

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "OPERACIÓN: Corte de Caja" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "Folio: #" + idCorteCaja }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "FECHA: " + oCorteCaja.data.createDateString }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "CREADO POR: " + oCorteCaja.data.createUserName }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, style: "Bold", text: "INGRESOS:", iWith: 100 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "VENTA:", iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "TALLER:", iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "INGRESO TOTAL:", iWith: 34 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.sales ), iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.tallerSales ), iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.ingresoTotal ), iWith: 34 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "EGRESOS:", iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "INGR MANUALES:", iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "INGRESO TOTAL:", iWith: 34 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.egresos ), iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.ingresosManuales ), iWith: 33 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.ingresoReal ), iWith: 34 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, style: "Bold", text: "DESGLOSE SISTEMA", iWith: 50 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 7, style: "Bold", text: "EXISTENCIA EN CAJA", iWith: 50 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "PESOS", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.pesos ), iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "PESOS", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.pesosCaja ), iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "DÓLARES (TC: "+ oCorteCaja.data.fxRate +")", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.dolares ), iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "DÓLARES", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.dolaresCaja ), iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "VOUCHERS", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.vouchers ), iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "VOUCHERS", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.vouchersCaja ), iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "TRANSFER", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.transferencias ), iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "TRANSFER", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.transferenciasCaja ), iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: " ", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 6, style: "Bold", text: "TOTAL EN CAJA", iWith: 50 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.totalCaja ), iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: " ", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: " ", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "DIFERENCIA", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( oCorteCaja.data.diferencia ), iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );


        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "SI CUADRÓ", iWith: 50 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: "NO CUADRÓ", iWith: 50 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: ( oCorteCaja.data.bCuadro == 1 ? "X" : " " ), iWith: 50 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 7, style: "Bold", text: ( oCorteCaja.data.bCuadro == 2 ? "X" : " " ), iWith: 50 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, style: "Bold", text: "COMENTARIOS:", iWith: 100 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, style: "Bold", text: oCorteCaja.data.observaciones, iWith: 100 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        const oEgresos = await this.salesServ.CGetEgresosByIDCorteCaja( idCorteCaja );

        if( oEgresos.data.length > 0 ){

          oLines = [];
          var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          oLines = [];
          var oLine: any = { aling: "Left", size: 7, style: "Bold", text: "LISTA DE EGRESOS:", iWith: 100 }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          oLines = [];
          var oLine: any = { aling: "Center", size: 10, text: " " }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          oLines = [];
          var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "# EGRESO", iWith: 20 }
          oLines.push( oLine );
          var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "DESCRIPCIÓN", iWith: 60 }
          oLines.push( oLine );
          var oLine: any = { aling: "Right", size: 5, style: "Bold", text: "MONTO", iWith: 20 }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          for(var i = 0; i < oEgresos.data.length; i++){

            oLines = [];
            var oLine: any = { aling: "Left", size: 7, text: oEgresos.data[i].idEgreso, iWith: 20 }
            oLines.push( oLine );
            var oLine: any = { aling: "Left", size: 7, text: oEgresos.data[i].description, iWith: 60 }
            oLines.push( oLine );
            var oLine: any = { aling: "Right", size: 7, text: USDollar.format( oEgresos.data[i].amount ), iWith: 20 }
            oLines.push( oLine );
            oLinesP.push( { oLines: oLines } );

          }

        }

        const oIngresos = await this.salesServ.CGetIngresosByIDCorteCaja( idCorteCaja );

        if( oIngresos.data.length > 0 ){

          oLines = [];
          var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          oLines = [];
          var oLine: any = { aling: "Left", size: 7, style: "Bold", text: "LISTA DE INGRESOS MANUALES:", iWith: 100 }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          oLines = [];
          var oLine: any = { aling: "Center", size: 10, text: " " }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          oLines = [];
          var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "# Ingreso", iWith: 20 }
          oLines.push( oLine );
          var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "DESCRIPCIÓN", iWith: 50 }
          oLines.push( oLine );
          var oLine: any = { aling: "Right", size: 5, style: "Bold", text: "MONTO", iWith: 30 }
          oLines.push( oLine );
          oLinesP.push( { oLines: oLines } );

          for(var i = 0; i < oIngresos.data.length; i++){

            oLines = [];
            var oLine: any = { aling: "Left", size: 7, text: oIngresos.data[i].idIngreso, iWith: 20 }
            oLines.push( oLine );
            var oLine: any = { aling: "Left", size: 7, text: oIngresos.data[i].description, iWith: 50 }
            oLines.push( oLine );
            var oLine: any = { aling: "Right", size: 7, text: USDollar.format( oIngresos.data[i].amount ), iWith: 30 }
            oLines.push( oLine );
            oLinesP.push( { oLines: oLines } );

          }

        }

      }



    }
    else if(type == "Egreso"){

      const egreso = await this.salesServ.CGetEgresoByIDPromise( idRelation );

      console.log(egreso);

      // CONSTRUYO EL HEADER
      const HeaderSuc = await this.sucursalesServ.CGetPrintTicketSuc( egreso.data.idSucursal, "Header");

      var oLines: any = [];

      oLines = [];
      var oLine: any = { bImage: true, base64Image: this.base64VioletaIcon, iHeight: this.iHeightLogo, ticketWidth: this.ticketWidth }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 20, text: "EGRESO" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      for(var i = 0; i < HeaderSuc.length; i++){

        oLines = [];

        var oLine: any = {
          aling: HeaderSuc[i].aling
          , size: HeaderSuc[i].size
          , text: HeaderSuc[i].text
        }

        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      // AGREGO LA INFORMACIÓN DELA OPERACIÓN
      if( egreso != null ){

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "OPERACIÓN: EGRESO #" +  egreso.data.idEgreso }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "FECHA: " + egreso.data.createDateString }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "DESCRIPCIÓN", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 5, style: "Bold", text: "MONTO", iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, style: "Bold", text: egreso.data.description, iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( egreso.data.amount ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 7, text: "---------------------------------------------------- " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 7, text: "FIRMA DE QUIEN EXPIDE" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 7, text: "---------------------------------------------------- " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 7, text: "FIRMA DE QUIEN RECIBE" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

    }
    else if(type == "Ingreso"){

      const ingreso = await this.salesServ.CGetIngresoByIDPromise( idRelation );

      // CONSTRUYO EL HEADER
      const HeaderSuc = await this.sucursalesServ.CGetPrintTicketSuc( ingreso.data.idSucursal, "Header");

      var oLines: any = [];

      oLines = [];
      var oLine: any = { bImage: true, base64Image: this.base64VioletaIcon, iHeight: this.iHeightLogo, ticketWidth: this.ticketWidth }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 20, text: "INGRESO" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      for(var i = 0; i < HeaderSuc.length; i++){

        oLines = [];

        var oLine: any = {
          aling: HeaderSuc[i].aling
          , size: HeaderSuc[i].size
          , text: HeaderSuc[i].text
        }

        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      // AGREGO LA INFORMACIÓN DELA OPERACIÓN
      if( ingreso != null ){

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "OPERACIÓN: INGRESO #" +  ingreso.data.idIngreso }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "FECHA: " + ingreso.data.createDateString }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 5, style: "Bold", text: "DESCRIPCIÓN", iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 5, style: "Bold", text: "MONTO", iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, style: "Bold", text: ingreso.data.description, iWith: 75 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: USDollar.format( ingreso.data.amount ), iWith: 25 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 7, text: " " }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

    }
    else if(type == "ConsHistory"){

      const sale = await this.salesServ.CGetSaleByIDPromise( idRelation );

      // CONSTRUYO EL HEADER
      const HeaderSuc = await this.sucursalesServ.CGetPrintTicketSuc( sale.data.idSucursal, "Header");

      var oLines: any = [];

      oLines = [];
      var oLine: any = { bImage: true, base64Image: this.base64VioletaIcon, iHeight: this.iHeightLogo, ticketWidth: this.ticketWidth }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      for(var i = 0; i < HeaderSuc.length; i++){

        oLines = [];

        var oLine: any = {
          aling: HeaderSuc[i].aling
          , size: HeaderSuc[i].size
          , text: HeaderSuc[i].text
        }

        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );
      }

      var OConsHistory = await this.salesServ.CGetConsHistoryPromise( idRelation );

      OConsHistory.data.rows[0].createDateString

      // AGREGO LA INFORMACIÓN DELA OPERACIÓN
      if( OConsHistory != null ){

        oLines = [];
        var oLine: any = { aling: "Center", size: 7, text: "OPERACIÓN: Movimientos de #" +  sale.data.idSale }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "PRODUCTO", iWith: 25 }
        oLines.push( oLine );
        var oLine: any = { aling: "Center", size: 6, style: "Bold", text: "CANT", iWith: 10 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "DESCRIPCIÓN", iWith: 40 }
        oLines.push( oLine );
        var oLine: any = { aling: "Left", size: 6, style: "Bold", text: "FECHA", iWith: 25 }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        for(var i = 0; i < OConsHistory.data.rows.length; i++){

          var oConsHistoryLine = OConsHistory.data.rows[i];

          oLines = [];
          var oLine: any = { aling: "Left", size: 7, text: oConsHistoryLine.name, iWith: 25 }
          oLines.push( oLine );
          var oLine: any = { aling: "Center", size: 7, text: oConsHistoryLine.consCantidad, iWith: 10 }
          oLines.push( oLine );
          var oLine: any = { aling: "Left", size: 7, text: oConsHistoryLine.description, iWith: 40 }
          oLines.push( oLine );
          var oLine: any = { aling: "Left", size: 7, text: oConsHistoryLine.createDateString, iWith: 25 }
          oLines.push( oLine );

          oLinesP.push( { oLines: oLines } );

        }

      }

    }
    else if(type == "DineroElectronico"){

      // AGREGO LA INFORMACIÓN DEL CLIENTE
      const OCustomerData = await this.customersServ.CGetCustomerByIDPromise( idRelation );

      oLines = [];
      var oLine: any = { bImage: true, base64Image: this.base64VioletaIcon, iHeight: this.iHeightLogo, ticketWidth: this.ticketWidth }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      if( OCustomerData != null ){

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "CLIENTE: " + OCustomerData.lastName + " " + OCustomerData.name }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "DIRECCIÓN: " + OCustomerData.address }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: "TELEFONO: " + OCustomerData.tel }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Left", size: 7, text: " " }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

        oLines = [];
        var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
        oLines.push( oLine );
        oLinesP.push( { oLines: oLines } );

      }


      oLines = [];
      var oLine: any = { aling: "Left", size: 7, style: "Bold", text: "DESCRIPCIÓN", iWith: 60 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 7, style: "Bold", text: "SALDO", iWith: 40 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Left", size: 9, text: 'Dinero Electrónico', iWith: 60 }
      oLines.push( oLine );
      var oLine: any = { aling: "Right", size: 9, text: USDollar.format( iPayments ), iWith: 40 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

    }
    else if(type == "codigoBarras"){

      var oProduct = await this.productsServ.CGetProductByIDPromise( idRelation )
      console.log(oProduct)

      var sCodeProduct = '';
      sCodeProduct += this.safeSubstring(oProduct.groupDesc, 0, 1);
      sCodeProduct += this.safeSubstring(oProduct.familyDesc, 0, 2);
      sCodeProduct += oProduct.qualityValue > 0 ? oProduct.qualityValue : '';
      sCodeProduct += this.safeSubstring(oProduct.originDesc, 0, 1);
      sCodeProduct += oProduct.gramos > 0 ? oProduct.gramos : '';

      console.log(sCodeProduct)

      sBarCode = oProduct.barCode;

      oLines = [];
      var oLine: any = { aling: "Center", size: 6, style: "Regular", text: sCodeProduct, iWith: 33 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

      oLines = [];
      var oLine: any = { aling: "Center", size: 6, style: "Regular", text: USDollar.format( oProduct.price ), iWith: 33 }
      oLines.push( oLine );
      oLinesP.push( { oLines: oLines } );

    }
    // else if(type == "calification"){

    //   const sale = await this.salesServ.CGetSaleByIDPromise( idRelation );

    //   console.log(sale);

    //   var oLines: any = [];

    //   oLines = [];
    //   var oLine: any = { aling: "Center", size: 15, text: "NOTA: " + sale.data.saleTypeDesc }
    //   oLines.push( oLine );
    //   oLinesP.push( { oLines: oLines } );

    //   oLines = [];
    //   var oLine: any = { aling: "Left", size: 7, text: " " }
    //   oLines.push( oLine );
    //   oLinesP.push( { oLines: oLines } );

    //   oLines = [];
    //   var oLine: any = { aling: "Center", size: 15, text: "Folio: #" + sale.data.idSale }
    //   oLines.push( oLine );
    //   oLinesP.push( { oLines: oLines } );

    //   oLines = [];
    //   var oLine: any = { aling: "Left", size: 7, text: " " }
    //   oLines.push( oLine );
    //   oLinesP.push( { oLines: oLines } );

    //   // AGREGO LA INFORMACIÓN DEL CLIENTE
    //   const OCustomerData = await this.customersServ.CGetCustomerByIDPromise( sale.data.idCustomer );

    //   if( OCustomerData != null ){

    //     oLines = [];
    //     var oLine: any = { aling: "Left", size: 7, text: "CLIENTE: " + OCustomerData.lastName + " " + OCustomerData.name }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //     oLines = [];
    //     var oLine: any = { aling: "Left", size: 7, text: "DIRECCIÓN: " + OCustomerData.address }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //     oLines = [];
    //     var oLine: any = { aling: "Left", size: 7, text: "TELEFONO: " + OCustomerData.tel }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //     oLines = [];
    //     var oLine: any = { aling: "Left", size: 7, text: " " }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );
    //   }

    //   // AGREGO LA INFORMACIÓN DELA OPERACIÓN
    //   if( sale != null ){

    //     oLines = [];
    //     var oLine: any = { aling: "Center", size: 7, text: "OPERACIÓN: Venta de " + sale.data.saleTypeDesc }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //     oLines = [];
    //     var oLine: any = { aling: "Left", size: 7, text: "Folio: #" + sale.data.idSale }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //     oLines = [];
    //     var oLine: any = { aling: "Left", size: 7, text: "FECHA: " + sale.data.createDateString }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //     oLines = [];
    //     var oLine: any = { aling: "Left", size: 7, text: "ATENDIÓ: " + sale.data.sellerDesc }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //     oLines = [];
    //     var oLine: any = { aling: "Center", size: 10, text: "---------------------------------------------------------" }
    //     oLines.push( oLine );
    //     oLinesP.push( { oLines: oLines } );

    //   }

    //   oLines = [];
    //   var oLine: any = { aling: "Center", size: 10, text: "De manera honesta, me gustaría que calificara mi servicio. Su opinión es muy importante para nosotros. ¡Gracias!" }
    //   oLines.push( oLine );
    //   oLinesP.push( { oLines: oLines } );


    //   oLines = [];
    //   var oLine: any = { bImage: true  }
    //   oLines.push( oLine );
    //   oLinesP.push( { oLines: oLines } );

    // }

    if(idPrinter > 0){

      var oPrinterData = await this.printersServ.CGetPrinterByIDPromise( idPrinter );

      if( oPrinterData.status == 0 && oLinesP.length > 0 ){

        let oPrinter: any = {
          printerName: oPrinterData.data.printerName,
          maxMargen: oPrinterData.data.maxMargen,
          sBarCode: sBarCode
        };

        let printParameters: any = {
          oPrinter: oPrinter,
          oLinesP: oLinesP
        }

        console.log(printParameters);

        for( var pri = 0; pri < iCopy; pri++ ){
          bOK = await this.CPrintTicketAwait( oPrinterData.data._api, printParameters );
        }

        return new Promise((resolve, reject) => {
          resolve( bOK )
        });

      }

    }

  }

  CPrintTicketAwait( _api:string, data : any ): Promise<any> {

    return new Promise((resolve, reject) => {

      this.http.post<ResponseGet>( `${ _api }/printTicket`, data)
      .subscribe({
        next: ( resp: ResponseGet ) => {
          resolve( resp );
        }
        , error: ( err: any ) => {
          reject( err );
        }
      });

    });

  }

  safeSubstring(input: string | null | undefined, start: number, length?: number): string {
    if (input == null || input == 'N/A') {
        return '';
    }

    return input.substring(start, length).toUpperCase();
  }


  iHeightLogo: number = 90;
  ticketWidth: number = 280;//280;
  base64VioletaIcon: string = "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"

}
