import { Injectable, OnModuleInit } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require('node:sqlite');

@Injectable()
export class PrismaService implements OnModuleInit {
  private db: any;

  constructor() {
    this.db = new DatabaseSync('cotitech.db');
    this.inicializarTablas();
  }

  async onModuleInit() {
    await this.seedInicial();
  }

  private inicializarTablas() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS CatalogoBase (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoria TEXT NOT NULL,
        modelo TEXT NOT NULL,
        precioBase REAL NOT NULL,
        activo INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS Precotizacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folio TEXT UNIQUE NOT NULL,
        catalogoId INTEGER NOT NULL,
        modeloNombre TEXT NOT NULL,
        categoria TEXT NOT NULL,
        vendedorNombre TEXT NOT NULL,
        vendedorContacto TEXT NOT NULL,
        estadoEstetico TEXT NOT NULL,
        funcionaAlCien INTEGER DEFAULT 1,
        incluyeCajaAccesorios INTEGER DEFAULT 0,
        ofertaMinima REAL NOT NULL,
        ofertaMaxima REAL NOT NULL,
        estatus TEXT DEFAULT 'PENDIENTE',
        creadoEn TEXT NOT NULL
      );
    `);
  }

  catalogoBase = {
    count: async (): Promise<number> => {
      const row = this.db.prepare('SELECT COUNT(*) as total FROM CatalogoBase').get();
      return Number(row?.total ?? 0);
    },

    findMany: async (args?: { where?: { activo?: boolean }; orderBy?: any }): Promise<any[]> => {
      let query = 'SELECT * FROM CatalogoBase';
      const params: any[] = [];
      if (args?.where?.activo !== undefined) {
        query += ' WHERE activo = ?';
        params.push(args.where.activo ? 1 : 0);
      }
      query += ' ORDER BY id ASC';
      const rows = this.db.prepare(query).all(...params);
      return rows.map((r: any) => ({
        id: Number(r.id),
        categoria: r.categoria,
        modelo: r.modelo,
        precioBase: Number(r.precioBase),
        activo: Boolean(r.activo),
      }));
    },

    findUnique: async ({ where }: { where: { id: number } }): Promise<any | null> => {
      const r = this.db
        .prepare('SELECT * FROM CatalogoBase WHERE id = ?')
        .get(Number(where.id));
      if (!r) return null;
      return {
        id: Number(r.id),
        categoria: r.categoria,
        modelo: r.modelo,
        precioBase: Number(r.precioBase),
        activo: Boolean(r.activo),
      };
    },

    create: async ({ data }: { data: any }): Promise<any> => {
      const stmt = this.db.prepare(
        'INSERT INTO CatalogoBase (categoria, modelo, precioBase, activo) VALUES (?, ?, ?, ?)',
      );
      const info = stmt.run(
        data.categoria,
        data.modelo,
        Number(data.precioBase),
        data.activo === false ? 0 : 1,
      );
      return {
        id: Number(info.lastInsertRowid),
        categoria: data.categoria,
        modelo: data.modelo,
        precioBase: Number(data.precioBase),
        activo: true,
      };
    },

    delete: async ({ where }: { where: { id: number } }): Promise<any> => {
      this.db.prepare('DELETE FROM CatalogoBase WHERE id = ?').run(Number(where.id));
      return { id: Number(where.id) };
    },
  };

  precotizacion = {
    findMany: async (args?: { orderBy?: any }): Promise<any[]> => {
      const rows = this.db
        .prepare('SELECT * FROM Precotizacion ORDER BY creadoEn DESC, id DESC')
        .all();
      return rows.map((r: any) => ({
        id: Number(r.id),
        folio: r.folio,
        catalogoId: Number(r.catalogoId),
        modeloNombre: r.modeloNombre,
        categoria: r.categoria,
        vendedorNombre: r.vendedorNombre,
        vendedorContacto: r.vendedorContacto,
        estadoEstetico: r.estadoEstetico,
        funcionaAlCien: Boolean(r.funcionaAlCien),
        incluyeCajaAccesorios: Boolean(r.incluyeCajaAccesorios),
        ofertaMinima: Number(r.ofertaMinima),
        ofertaMaxima: Number(r.ofertaMaxima),
        estatus: r.estatus,
        creadoEn: r.creadoEn,
      }));
    },

    create: async ({ data }: { data: any }): Promise<any> => {
      const creadoEn = data.creadoEn
        ? new Date(data.creadoEn).toISOString()
        : new Date().toISOString();

      const stmt = this.db.prepare(`
        INSERT INTO Precotizacion (
          folio, catalogoId, modeloNombre, categoria,
          vendedorNombre, vendedorContacto, estadoEstetico,
          funcionaAlCien, incluyeCajaAccesorios,
          ofertaMinima, ofertaMaxima, estatus, creadoEn
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        data.folio,
        Number(data.catalogoId),
        data.modeloNombre,
        data.categoria,
        data.vendedorNombre,
        data.vendedorContacto,
        data.estadoEstetico,
        data.funcionaAlCien ? 1 : 0,
        data.incluyeCajaAccesorios ? 1 : 0,
        Number(data.ofertaMinima),
        Number(data.ofertaMaxima),
        data.estatus || 'PENDIENTE',
        creadoEn,
      );

      return {
        id: Number(info.lastInsertRowid),
        ...data,
        funcionaAlCien: Boolean(data.funcionaAlCien),
        incluyeCajaAccesorios: Boolean(data.incluyeCajaAccesorios),
        estatus: data.estatus || 'PENDIENTE',
        creadoEn,
      };
    },

    update: async ({ where, data }: { where: { id: number }; data: { estatus: string } }): Promise<any> => {
      this.db
        .prepare('UPDATE Precotizacion SET estatus = ? WHERE id = ?')
        .run(data.estatus, Number(where.id));

      const r = this.db
        .prepare('SELECT * FROM Precotizacion WHERE id = ?')
        .get(Number(where.id));
      return {
        ...r,
        id: Number(r.id),
        funcionaAlCien: Boolean(r.funcionaAlCien),
        incluyeCajaAccesorios: Boolean(r.incluyeCajaAccesorios),
      };
    },
  };

  private calcularRango(base: number, est: string, funciona: boolean, caja: boolean) {
    const factores: Record<string, number> = {
      IMPECABLE: 1,
      DETALLES_LEVES: 0.85,
      DESGASTE_NOTABLE: 0.65,
    };
    const factorEstetico = factores[est] ?? 1;
    const v = base * factorEstetico * (funciona ? 1 : 0.5) * (caja ? 1.05 : 1);
    return [Math.round((v * 0.9) / 10) * 10, Math.round((v * 1.1) / 10) * 10];
  }

  private async seedInicial() {
    const total = await this.catalogoBase.count();
    if (total > 0) return;

    console.log('Inicializando base de datos SQLite (cotitech.db) con el tabulador de CotiTech...');

    const modelosSemilla = [
      { categoria: 'GPU', modelo: 'NVIDIA RTX 3060 12GB', precioBase: 4800 },
      { categoria: 'GPU', modelo: 'NVIDIA RTX 4060 8GB', precioBase: 5600 },
      { categoria: 'GPU', modelo: 'AMD RX 6700 XT', precioBase: 4200 },
      { categoria: 'CPU', modelo: 'AMD Ryzen 5 5600X', precioBase: 2300 },
      { categoria: 'CPU', modelo: 'Intel Core i7-12700K', precioBase: 4100 },
      { categoria: 'Laptop', modelo: 'Laptop HP Pavilion 15', precioBase: 8500 },
      { categoria: 'Laptop', modelo: 'MacBook Air M1 256GB', precioBase: 9800 },
      { categoria: 'Celular', modelo: 'iPhone 13 Pro 128GB', precioBase: 8300 },
      { categoria: 'Celular', modelo: 'Samsung Galaxy S22 128GB', precioBase: 4500 },
      { categoria: 'RAM_SSD', modelo: 'Kingston Fury 16GB DDR4', precioBase: 450 },
      { categoria: 'RAM_SSD', modelo: 'Samsung 970 EVO 1TB NVMe', precioBase: 900 },
      { categoria: 'Motherboard', modelo: 'ASUS TUF B550-Plus', precioBase: 1800 },
    ];

    const creados = [];
    for (const item of modelosSemilla) {
      const m = await this.catalogoBase.create({ data: item });
      creados.push(m);
    }

    const foliosSemilla: Array<[number, string, string, string, boolean, boolean, string, number]> = [
      [8, 'Carlos López', '55 1234 5678', 'IMPECABLE', true, true, 'PENDIENTE', 0],
      [6, 'Ana Martínez', 'ana.mtz@mail.com', 'DETALLES_LEVES', true, false, 'PENDIENTE', 1],
      [1, 'Luis Ramírez', '81 4455 6677', 'DESGASTE_NOTABLE', true, false, 'ACEPTADO', 2],
      [9, 'Sofía Herrera', '33 9988 7766', 'DETALLES_LEVES', false, false, 'RECHAZADO', 3],
      [4, 'Jorge Pérez', 'jorge.p@mail.com', 'IMPECABLE', true, true, 'ACEPTADO', 5],
      [7, 'María Torres', '55 2211 3344', 'IMPECABLE', true, false, 'PENDIENTE', 0],
    ];

    for (const [idx, nombre, contacto, est, func, caja, estatus, dias] of foliosSemilla) {
      const m = creados[idx - 1];
      const [min, max] = this.calcularRango(m.precioBase, est, func, caja);
      await this.precotizacion.create({
        data: {
          folio: 'CTZ-' + Math.floor(10000 + Math.random() * 90000),
          catalogoId: m.id,
          modeloNombre: m.modelo,
          categoria: m.categoria,
          vendedorNombre: nombre,
          vendedorContacto: contacto,
          estadoEstetico: est,
          funcionaAlCien: func,
          incluyeCajaAccesorios: caja,
          ofertaMinima: min,
          ofertaMaxima: max,
          estatus,
          creadoEn: new Date(Date.now() - dias * 86400000),
        },
      });
    }
  }
}