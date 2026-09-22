#!/usr/bin/env node
import config from '../src/config.js';
import { db } from '../src/core/db.js';
import { listar, porId, moverEtapa, avanzar, eventosDe, resumenPorEtapa, guardarLead } from '../src/core/leads.js';
import { generarTareas, colaDeHoy, completarTarea, tareasPendientes } from '../src/core/tareas.js';
import { correrSecuencias } from '../src/core/secuencias.js';
import { correrRutinaDiaria } from '../src/core/programador.js';
import { enviarResumenDiario, construirResumen } from '../src/core/resumen.js';
import { generarCalendario, guardarCalendario, listarPublicaciones, publicacionesPendientes, exportarCSV } from '../src/core/contenido.js';
import { publicarPendientes } from '../src/core/instagram.js';
import { ETAPAS, clavesEtapas } from '../src/core/pipeline.js';
import { formatearTelefono } from '../src/core/telefono.js';
import { clp } from '../src/core/catalogo.js';
import { listarPlantillas } from '../src/core/plantillas.js';

const [, , comando, ...args] = process.argv;
const bandera = (nombre) => args.includes(`--${nombre}`);
const valor = (nombre, porDefecto) => {
  const i = args.indexOf(`--${nombre}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : porDefecto;
};

const linea = (n = 64) => console.log('-'.repeat(n));

function ayuda() {
  console.log(`
APPOS - automatizacion de ventas, contacto y publicaciones

  appos hoy                       Cola de trabajo del dia, con mensajes y enlaces listos
  appos generar                   Revisa los leads y crea las tareas que corresponden
  appos hecha <idTarea>           Marca una tarea como hecha
  appos leads [--etapa <etapa>]   Lista los leads
  appos lead <id>                 Ficha del lead con su historial
  appos nuevo                     Carga un lead a mano (--nombre --telefono --email --rubro)
  appos mover <id> <etapa>        Cambia la etapa del lead
  appos avanzar <id>              Pasa el lead a la etapa siguiente
  appos pipeline                  Resumen por etapa

  appos rutina [--forzar]         Corre la rutina diaria completa (tareas + correos + resumen)
  appos resumen [--simular]       Envia el correo resumen del dia a tu casilla
  appos secuencias [--simular]    Envia los correos de postventa que ya corresponden
  appos contenido [--cantidad N]  Genera y guarda el calendario de publicaciones
  appos calendario                Muestra el calendario guardado
  appos exportar                  Imprime el calendario en CSV
  appos publicar                  Publica en Instagram las piezas cuya fecha ya llego

  appos diagnostico               Revisa que este todo configurado
  appos etapas                    Lista las etapas del pipeline

Etapas: ${clavesEtapas().join(', ')}
`);
}

function mostrarTarea(t) {
  linea();
  console.log(`[tarea ${t.id}] ${t.titulo}`);
  console.log(`Cliente : ${t.lead.nombre || 'sin nombre'}  ${formatearTelefono(t.lead.telefono) || t.lead.email || ''}`);
  console.log(`Etapa   : ${t.lead.etapa}${t.lead.rubro ? ` · ${t.lead.rubro}` : ''}`);
  if (t.mensaje) {
    console.log('\nMensaje listo para enviar:\n');
    console.log(t.mensaje.split('\n').map((l) => '  ' + l).join('\n'));
  }
  if (t.enlace) console.log(`\nAbrir WhatsApp:\n  ${t.enlace}`);
  console.log(`\nAl terminar:  appos hecha ${t.id}`);
}

async function principal() {
  db();

  switch (comando) {
    case 'hoy': {
      const { creadas } = generarTareas();
      const cola = colaDeHoy();
      console.log(`\nCola de hoy · ${cola.length} pendientes${creadas ? ` (${creadas} nuevas)` : ''}\n`);
      if (!cola.length) { console.log('  Nada pendiente. Todo al dia.\n'); break; }
      cola.forEach(mostrarTarea);
      linea();
      break;
    }

    case 'generar': {
      const { creadas, detalle } = generarTareas();
      console.log(`${creadas} tareas creadas. Pendientes en total: ${tareasPendientes()}`);
      detalle.forEach((d) => console.log('  - ' + d));
      break;
    }

    case 'hecha': {
      const t = completarTarea(Number(args[0]));
      console.log(t ? `Tarea ${args[0]} marcada como hecha.` : `No existe la tarea ${args[0]}.`);
      break;
    }

    case 'leads': {
      const filas = listar({ etapa: valor('etapa', undefined), limite: Number(valor('limite', 50)) });
      if (!filas.length) { console.log('Sin leads.'); break; }
      for (const l of filas) {
        console.log(`#${String(l.id).padEnd(4)} ${(l.nombre || 'sin nombre').padEnd(24).slice(0, 24)} ${(formatearTelefono(l.telefono) || l.email || '').padEnd(18)} ${l.etapa.padEnd(14)} ${l.valor_estimado ? clp(l.valor_estimado) : ''}`);
      }
      console.log(`\n${filas.length} leads.`);
      break;
    }

    case 'lead': {
      const l = porId(Number(args[0]));
      if (!l) { console.log('No existe ese lead.'); break; }
      linea();
      console.log(`#${l.id} ${l.nombre || 'sin nombre'}`);
      console.log(`Telefono : ${formatearTelefono(l.telefono) || '-'}`);
      console.log(`Correo   : ${l.email || '-'}`);
      console.log(`Rubro    : ${l.rubro || '-'}   Comuna: ${l.comuna || '-'}`);
      console.log(`Etapa    : ${l.etapa} (desde ${l.etapa_desde.slice(0, 16).replace('T', ' ')})`);
      console.log(`Origen   : ${l.origen}   Valor: ${l.valor_estimado ? clp(l.valor_estimado) : '-'}`);
      if (l.interes) console.log(`Interes  :\n${l.interes.split('\n').map((x) => '  ' + x).join('\n')}`);
      console.log('\nHistorial:');
      for (const e of eventosDe(l.id)) console.log(`  ${e.creado.slice(0, 16).replace('T', ' ')}  ${e.tipo.padEnd(12)} ${e.detalle}`);
      linea();
      break;
    }

    case 'nuevo': {
      const { lead, creado } = guardarLead({
        nombre: valor('nombre', ''), telefono: valor('telefono', ''), email: valor('email', ''),
        rubro: valor('rubro', ''), comuna: valor('comuna', ''), origen: valor('origen', 'manual'),
        interes: valor('interes', ''),
      });
      console.log(`${creado ? 'Lead creado' : 'Lead ya existia, se actualizo'}: #${lead.id} ${lead.nombre || lead.telefono}`);
      break;
    }

    case 'mover': {
      const l = moverEtapa(Number(args[0]), args[1], 'cambio manual');
      console.log(`#${l.id} ahora esta en: ${l.etapa}`);
      break;
    }

    case 'avanzar': {
      const l = avanzar(Number(args[0]), 'avance manual');
      console.log(`#${l.id} ahora esta en: ${l.etapa}`);
      break;
    }

    case 'pipeline': {
      const resumen = new Map(resumenPorEtapa().map((r) => [r.etapa, r.total]));
      console.log('');
      for (const e of ETAPAS) console.log(`  ${e.nombre.padEnd(20)} ${String(resumen.get(e.clave) ?? 0).padStart(4)}`);
      console.log('');
      break;
    }

    case 'rutina': {
      const r = await correrRutinaDiaria({ forzar: bandera('forzar') });
      if (!r.corrio) { console.log(`La rutina no corrio: ${r.motivo}. Usa --forzar para correrla igual.`); break; }
      console.log(`Rutina del ${r.fecha}: ${r.tareasCreadas} tareas creadas, ${r.correosEnviados} correos enviados, ${r.correosPendientes} no enviados.`);
      console.log(`Resumen diario: ${r.resumen.enviado ? `enviado a ${config.negocio.correo}` : `no enviado (${r.resumen.motivo})`}`);
      break;
    }

    case 'resumen': {
      const simular = bandera('simular') || config.email.proveedor === 'consola';
      const r = await enviarResumenDiario({ forzar: true, simular });
      if (r.motivo === 'sin pendientes') { console.log('No hay pendientes hoy: no se envia resumen.'); break; }
      if (simular) {
        console.log(`Para: ${config.negocio.correo}`);
        console.log(`Asunto: ${r.asunto}\n`);
        console.log(r.cuerpo);
        if (config.email.proveedor === 'consola') console.log('\n(EMAIL_PROVIDER=consola: no se envio de verdad)');
        break;
      }
      console.log(r.enviado
        ? `Resumen enviado a ${config.negocio.correo}: ${r.total} pendientes, ${r.urgentes} urgentes.`
        : `No se pudo enviar: ${r.error ?? r.motivo}`);
      break;
    }

    case 'secuencias': {
      const simular = bandera('simular');
      const r = await correrSecuencias({ simular });
      if (!r.length) { console.log('No hay correos por enviar.'); break; }
      for (const x of r) {
        const estado = x.simulado ? 'SIMULADO' : (x.enviado ? 'ENVIADO ' : 'PENDIENTE');
        console.log(`  ${estado}  lead #${x.leadId}  ${x.plantilla.padEnd(18)} -> ${x.para}${x.error ? `  (${x.error})` : ''}`);
      }
      if (config.email.proveedor === 'consola') console.log(`\nEMAIL_PROVIDER=consola: no se envio nada de verdad.`);
      break;
    }

    case 'contenido': {
      const cantidad = Number(valor('cantidad', 12));
      const piezas = generarCalendario({ cantidad });
      const guardadas = guardarCalendario(piezas);
      console.log(`${piezas.length} piezas generadas, ${guardadas} nuevas guardadas.`);
      for (const p of piezas) console.log(`  ${p.fecha}  ${p.formato.padEnd(9)} ${p.titulo}`);
      console.log(`\nVer el detalle:  appos calendario`);
      break;
    }

    case 'calendario': {
      const piezas = listarPublicaciones(Number(valor('limite', 20)));
      if (!piezas.length) { console.log('Sin calendario. Corre: appos contenido'); break; }
      for (const p of piezas) {
        linea();
        console.log(`${p.fecha}  ${p.formato.toUpperCase()}  [${p.estado}]  ${p.titulo}`);
        console.log('');
        console.log(p.copy.split('\n').map((l) => '  ' + l).join('\n'));
        console.log('\n  ' + p.hashtags);
      }
      linea();
      break;
    }

    case 'exportar':
      console.log(exportarCSV(listarPublicaciones(200)));
      break;

    case 'publicar': {
      const pendientes = publicacionesPendientes();
      if (!pendientes.length) { console.log('No hay publicaciones con fecha cumplida.'); break; }
      const r = await publicarPendientes(pendientes);
      for (const x of r) console.log(`  ${x.publicado ? 'PUBLICADO' : 'NO PUBLICADO'}  ${x.fecha}  ${x.titulo}${x.error ? `  (${x.error})` : ''}`);
      break;
    }

    case 'etapas':
      for (const e of ETAPAS) {
        console.log(`  ${e.clave.padEnd(16)} ${e.slaHoras ? `${e.slaHoras}h`.padEnd(6) : '-'.padEnd(6)} ${e.accion}`);
      }
      break;

    case 'diagnostico': {
      const revisar = (etiqueta, ok, pista) => console.log(`  ${ok ? 'OK  ' : 'FALTA'} ${etiqueta.padEnd(34)}${ok ? '' : pista}`);
      console.log('\nConfiguracion:\n');
      revisar('WhatsApp de APPOS', config.negocio.whatsapp !== '56900000000', 'define APPOS_WHATSAPP en .env');
      revisar('Secreto de webhooks Shopify', !!config.shopify.webhookSecret, 'define SHOPIFY_WEBHOOK_SECRET');
      revisar('Proveedor de correo', config.email.proveedor !== 'consola', 'define EMAIL_PROVIDER y EMAIL_API_KEY');
      revisar('Token del panel', !!config.servidor.panelToken, 'define PANEL_TOKEN para abrirlo fuera de localhost');
      revisar('Resumen diario por correo', config.servidor.resumenDiario && config.email.proveedor !== 'consola', 'necesita EMAIL_PROVIDER real para llegarte');
      revisar('URL del panel en el resumen', !!config.servidor.panelUrl, 'define PANEL_URL para que el correo traiga el enlace');
      revisar('Instagram (opcional)', !!(config.instagram.igUserId && config.instagram.token), 'define IG_USER_ID e IG_TOKEN');
      revisar('WhatsApp Cloud API (opcional)', config.whatsapp.modo === 'cloud', 'sigue con enlaces wa.me, funciona igual');
      console.log(`\nDatos:\n`);
      console.log(`  Base de datos      ${config.db.ruta}`);
      console.log(`  Leads              ${listar({ limite: 100000 }).length}`);
      console.log(`  Tareas pendientes  ${tareasPendientes()}`);
      console.log(`  Plantillas WA      ${listarPlantillas('whatsapp').join(', ')}`);
      console.log(`  Plantillas correo  ${listarPlantillas('email').join(', ')}`);
      console.log('');
      break;
    }

    default:
      ayuda();
  }
}

principal().catch((e) => { console.error('Error:', e.message); process.exit(1); });
