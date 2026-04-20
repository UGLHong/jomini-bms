export default defineEventHandler(() => ({
  ok: true,
  service: 'jomini-bms',
  timestamp: new Date().toISOString(),
}))
