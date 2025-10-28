export function registerSystemRoutes(router) {
  router.get('/health', async ctx => {
    ctx.ok({ status: 'ok', timestamp: new Date().toISOString() });
  });
}
