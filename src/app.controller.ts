import { Controller, Get, Post, Delete, Patch, Body, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('catalogo')
  getCatalogo() {
    return this.appService.obtenerCatalogo();
  }

  @Post('catalogo')
  crearCatalogo(@Body() body: { categoria: string; modelo: string; precioBase: number }) {
    return this.appService.crearModeloCatalogo(body);
  }

  @Delete('catalogo/:id')
  eliminarCatalogo(@Param('id') id: string) {
    return this.appService.eliminarModeloCatalogo(Number(id));
  }

  @Get('precotizaciones')
  getPrecotizaciones() {
    return this.appService.obtenerPrecotizaciones();
  }

  @Post('precotizaciones')
  crearPrecotizacion(
    @Body()
    body: {
      catalogoId: number;
      vendedorNombre: string;
      vendedorContacto: string;
      estadoEstetico: string;
      funcionaAlCien: boolean;
      incluyeCajaAccesorios: boolean;
    },
  ) {
    return this.appService.generarPrecotizacion(body);
  }

  @Patch('precotizaciones/:id/estatus')
  cambiarEstatus(@Param('id') id: string, @Body() body: { estatus: string }) {
    return this.appService.actualizarEstatusFolio(Number(id), body.estatus);
  }
}