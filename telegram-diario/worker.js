function hoyART() {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function esc(s) {
  return (s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function formatearMensaje(grupos, causas, hoy) {
  const total = grupos.vencidas.length + grupos.hoy.length + grupos.proximas.length + grupos.sinfecha.length;
  if (total === 0) {
    return `🧾 <b>Buenos días</b> — ${hoy}\n\nSin pendientes. Todo al día 🎉`;
  }

  const secciones = [
    ['🔴 Vencidas', grupos.vencidas],
    ['🟠 Hoy', grupos.hoy],
    ['🔵 Próximas', grupos.proximas],
    ['⚪ Sin fecha', grupos.sinfecha],
  ];

  let out = `🧾 <b>Buenos días</b> — ${hoy}\n`;
  for (const [nombre, items] of secciones) {
    if (!items.length) continue;
    out += `\n<b>${nombre} (${items.length})</b>\n`;
    for (const t of items) {
      const fecha = t.fecha_vencimiento
        ? ` [${t.fecha_vencimiento}${t.hora_vencimiento ? ' ' + t.hora_vencimiento.slice(0, 5) : ''}]`
        : '';
      const causa = t.causa_id && causas[t.causa_id] ? ` (${esc(causas[t.causa_id])})` : '';
      out += `• ${esc(t.titulo)}${fecha}${causa}\n`;
    }
  }
  return out.trim();
}

async function obtenerTareasPendientes(env) {
  const url = `${env.SUPABASE_URL}/rest/v1/tareas?select=id,titulo,descripcion,fecha_vencimiento,hora_vencimiento,causa_id&estado=eq.pendiente&order=fecha_vencimiento.asc.nullslast`;
  const resp = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_KEY,
      Authorization: `Bearer ${env.SUPABASE_KEY}`,
    },
  });
  if (!resp.ok) throw new Error('Error consultando Supabase (tareas): ' + resp.status);
  return resp.json();
}

async function obtenerCausas(env, causaIds) {
  if (!causaIds.length) return {};
  const url = `${env.SUPABASE_URL}/rest/v1/causas?select=id,imputado,caratula&id=in.(${causaIds.join(',')})`;
  const resp = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_KEY,
      Authorization: `Bearer ${env.SUPABASE_KEY}`,
    },
  });
  if (!resp.ok) return {};
  const rows = await resp.json();
  const causas = {};
  rows.forEach(c => { causas[c.id] = c.imputado || c.caratula || ''; });
  return causas;
}

async function enviarTelegram(env, texto) {
  const resp = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: texto,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error('Error enviando a Telegram: ' + err);
  }
}

async function enviarResumenDiario(env) {
  const tareas = await obtenerTareasPendientes(env);

  const hoy = hoyART();
  const grupos = { vencidas: [], hoy: [], proximas: [], sinfecha: [] };
  for (const t of tareas) {
    if (!t.fecha_vencimiento) grupos.sinfecha.push(t);
    else if (t.fecha_vencimiento < hoy) grupos.vencidas.push(t);
    else if (t.fecha_vencimiento === hoy) grupos.hoy.push(t);
    else grupos.proximas.push(t);
  }

  const causaIds = [...new Set(tareas.filter(t => t.causa_id).map(t => t.causa_id))];
  const causas = await obtenerCausas(env, causaIds);

  const texto = formatearMensaje(grupos, causas, hoy);
  await enviarTelegram(env, texto);
}

export default {
  async scheduled(event, env, ctx) {
    await enviarResumenDiario(env);
  },
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/enviar') {
      await enviarResumenDiario(env);
      return new Response('Resumen enviado.');
    }
    return new Response('ok');
  },
};
