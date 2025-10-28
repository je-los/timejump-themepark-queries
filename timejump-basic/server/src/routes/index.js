import { registerAuthRoutes } from './auth.js';
import { registerCatalogRoutes } from './catalog.js';
import { registerOperationsRoutes } from './operations.js';
import { registerMaintenanceRoutes } from './maintenance.js';
import { registerIncidentRoutes } from './incidents.js';
import { registerReportRoutes } from './reports.js';
import { registerRideRoutes } from './rides.js';
import { registerSystemRoutes } from './system.js';
import { registerThemeRoutes } from './themes.js';

export function registerRoutes(router) {
  registerSystemRoutes(router);
  registerAuthRoutes(router);
  registerCatalogRoutes(router);
  registerThemeRoutes(router);
  registerOperationsRoutes(router);
  registerMaintenanceRoutes(router);
  registerIncidentRoutes(router);
  registerReportRoutes(router);
  registerRideRoutes(router);
}
