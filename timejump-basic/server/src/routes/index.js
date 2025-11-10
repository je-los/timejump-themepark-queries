import { registerAuthRoutes } from './auth.js';
import { registerCatalogRoutes } from './catalog.js';
import { registerOperationsRoutes } from './operations.js';
import { registerMaintenanceRoutes } from './maintenance.js';
import { registerReportRoutes } from './reports.js';
import { registerRideRoutes } from './rides.js';
import { registerSystemRoutes } from './system.js';
import { registerThemeRoutes } from './themes.js';
import { registerOrderRoutes } from './orders.js';
import { registerProfileRoutes } from './profile.js';

export function registerRoutes(router) {
  registerSystemRoutes(router);
  registerAuthRoutes(router);
  registerCatalogRoutes(router);
  registerThemeRoutes(router);
  registerOrderRoutes(router);
  registerProfileRoutes(router);
  registerOperationsRoutes(router);
  registerMaintenanceRoutes(router);
  registerReportRoutes(router);
  registerRideRoutes(router);
}
