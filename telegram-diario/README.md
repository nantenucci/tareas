# Resumen diario por Telegram

Cloudflare Worker con Cron Trigger que todos los días a las 07:00 (hora Argentina)
lee las tareas pendientes de Supabase y las manda por Telegram.

## Deploy

npx wrangler login
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
npx wrangler deploy

## Probar

Visitá <tu-url-del-worker>/enviar para forzar el envío sin esperar a las 7.
