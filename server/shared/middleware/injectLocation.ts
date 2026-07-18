import { Request, Response, NextFunction } from 'express';
import { storage } from '../../storage';

/**
 * Middleware that automatically injects location from session into request body
 * for operational endpoints (medical visits, incidents, appointments, tests, etc.)
 */
export async function injectLocationMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }
  const operationalEndpoints = [
    '/api/incidents',
    '/api/appointments',
    '/api/portal-appointment-requests',
    '/api/drug-tests',
    '/api/alcohol-tests',
    '/api/hydration-tests',
    '/api/instant-tests',
  ];
  const fullPath = (req.baseUrl || '') + (req.path || '');
  const needsLocation = operationalEndpoints.some(endpoint =>
    fullPath.startsWith(endpoint)
  );
  if (!needsLocation) {
    return next();
  }

  console.log('=== LOCATION INJECTION MIDDLEWARE ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Needs Location:', needsLocation);

  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '') ||
      (req as any).cookies?.sessionToken;
    console.log('Session token:', sessionToken ? sessionToken.substring(0, 10) + '...' : 'none');

    if (!sessionToken) {
      console.log('No session token, skipping location injection');
      return next();
    }

    const session = await storage.getUserSession(sessionToken);
    console.log('Session found:', session ? 'yes' : 'no');
    console.log('Session activeLocationId:', session?.activeLocationId || 'none');

    if (!session) {
      return next();
    }

    const user = (req as any).user;
    console.log('User:', user ? user.id : 'none');
    console.log('User tenantId:', user?.tenantId || 'none');

    if (!user || !user.tenantId) {
      console.log('No user or tenantId, skipping');
      return next();
    }

    const tenant = await storage.getTenant(user.tenantId);
    console.log('Tenant hasMultipleLocations:', tenant?.hasMultipleLocations);

    if (!tenant) {
      return next();
    }

    if (tenant.hasMultipleLocations && !session.activeLocationId) {
      console.log('Multi-location tenant but no active location - returning error');
      return res.status(400).json({
        error: 'LOCATION_REQUIRED',
        message: 'Please select your working location before creating records.',
        action: 'SELECT_LOCATION'
      });
    }

    if (!tenant.hasMultipleLocations && !session.activeLocationId) {
      console.log('Single-location tenant, getting primary location');
      const primaryLocation = await storage.getPrimaryCareLocation(user.tenantId);
      if (primaryLocation) {
        console.log('Injecting primary location:', primaryLocation.id);
        req.body.locationId = primaryLocation.id;
      }
    } else if (session.activeLocationId) {
      console.log('Multi-location tenant with active location:', session.activeLocationId);
      const location = await storage.getCareLocation(session.activeLocationId, user.tenantId);
      if (!location || location.status !== 'active') {
        console.log('Location inactive or not found, clearing session');
        await storage.setSessionLocation(sessionToken, '', '');
        return res.status(400).json({
          error: 'LOCATION_INACTIVE',
          message: 'Your selected location is no longer active. Please select a new location.',
          action: 'SELECT_LOCATION'
        });
      }
      console.log('✅ INJECTING LOCATION:', session.activeLocationId, 'into req.body.locationId');
      req.body.locationId = session.activeLocationId;
    }

    console.log('Final req.body.locationId:', req.body.locationId);
    (req as any).activeLocation = session.activeLocationId;
    (req as any).activeLocationName = session.activeLocationName;
    console.log('=== END LOCATION INJECTION ===');
    next();
  } catch (error) {
    console.error('Error in location injection middleware:', error);
    next();
  }
}

/**
 * Middleware that requires an active location for the request
 */
export async function requireLocationMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    if (!user || !user.tenantId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const sessionToken = req.headers.authorization?.replace('Bearer ', '') ||
      (req as any).cookies?.sessionToken;
    if (!sessionToken) {
      return res.status(401).json({ message: 'No active session' });
    }
    const session = await storage.getUserSession(sessionToken);
    if (!session) {
      return res.status(401).json({ message: 'Invalid session' });
    }
    const tenant = await storage.getTenant(user.tenantId);
    if (!tenant) {
      return res.status(400).json({ message: 'Invalid tenant' });
    }
    if (tenant.hasMultipleLocations && !session.activeLocationId) {
      return res.status(400).json({
        error: 'NO_ACTIVE_LOCATION',
        message: 'No active location selected. Please select your working location.',
        action: 'SELECT_LOCATION'
      });
    }
    if (session.activeLocationId) {
      const location = await storage.getCareLocation(session.activeLocationId, user.tenantId);
      if (!location || location.status !== 'active') {
        await storage.setSessionLocation(sessionToken, '', '');
        return res.status(400).json({
          error: 'LOCATION_INACTIVE',
          message: 'Your selected location is no longer active. Please select a new location.',
          action: 'SELECT_LOCATION'
        });
      }
      (req as any).activeLocation = location;
    }
    next();
  } catch (error) {
    console.error('Error in require location middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
