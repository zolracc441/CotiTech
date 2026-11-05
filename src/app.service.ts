import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerCatalogo() {
    return this.prisma.catalogoBase.findMany({
      where: { activo: true },
      orderBy: { id: 'asc' },
    });
  }

  async crearModeloCatalogo(datos: { categoria: string; modelo: string; precioBase: number }) {
    return this.prisma.catalogoBase.create({
      data: {
        categoria: datos.categoria,
        modelo: datos.modelo,
        precioBase: Number(datos.precioBase),
        activo: true,
      },
    });
  }

  async eliminarModeloCatalogo(id: number) {
    return this.prisma.catalogoBase.delete({
      where: { id: Number(id) },
    });
  }

  async obtenerPrecotizaciones() {
    return this.prisma.precotizacion.findMany({
      orderBy: { creadoEn: 'desc' },
    });
  }

  async generarPrecotizacion(datos: {
    catalogoId: number;
    vendedorNombre: string;
    vendedorContacto: string;
    estadoEstetico: string;
    funcionaAlCien: boolean;
    incluyeCajaAccesorios: boolean;
  }) {
    const equipo = await this.prisma.catalogoBase.findUnique({
      where: { id: Number(datos.catalogoId) },
    });

    if (!equipo) {
      throw new NotFoundException('El modelo seleccionado no existe en el tabulador de CotiTech.');
    }

    const factores: Record<string, number> = {
      IMPECABLE: 1,
      DETALLES_LEVES: 0.85,
      DESGASTE_NOTABLE: 0.65,
    };
    const factorEstetico = factores[datos.estadoEstetico] ?? 1;
    const valorBaseAjustado =
      equipo.precioBase *
      factorEstetico *
      (datos.funcionaAlCien ? 1 : 0.5) *
      (datos.incluyeCajaAccesorios ? 1.05 : 1);

    const ofertaMinima = Math.round((valorBaseAjustado * 0.9) / 10) * 10;
    const ofertaMaxima = Math.round((valorBaseAjustado * 1.1) / 10) * 10;
    const folio = `CTZ-${Math.floor(10000 + Math.random() * 90000)}`;

    return this.prisma.precotizacion.create({
      data: {
        folio,
        catalogoId: equipo.id,
        modeloNombre: equipo.modelo,
        categoria: equipo.categoria,
        vendedorNombre: datos.vendedorNombre,
        vendedorContacto: datos.vendedorContacto,
        estadoEstetico: datos.estadoEstetico,
        funcionaAlCien: Boolean(datos.funcionaAlCien),
        incluyeCajaAccesorios: Boolean(datos.incluyeCajaAccesorios),
        ofertaMinima,
        ofertaMaxima,
        estatus: 'PENDIENTE',
      },
    });
  }

  async actualizarEstatusFolio(id: number, estatus: string) {
    return this.prisma.precotizacion.update({
      where: { id: Number(id) },
      data: { estatus },
    });
  }
}