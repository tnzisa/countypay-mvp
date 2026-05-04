/**
 * Tenant Middleware - Handles multi-tenancy routing and isolation
 */

const { prisma } = require('../lib/prisma');

/**
 * Extract tenant from request (from URL, header, or subdomain)
 * Supports three patterns:
 * 1. Header: X-Organization-Id
 * 2. URL param: /api/:organizationSlug/...
 * 3. Subdomain: tenant.countypay.com
 */
async function resolveTenant(req) {
  let organizationId = null;
  let organizationSlug = null;

  // Priority 1: Check Authorization header's organizationId (JWT payload)
  if (req.user?.organizationId) {
    organizationId = req.user.organizationId;
  }

  // Priority 2: Check X-Organization-Id header
  if (!organizationId && req.headers['x-organization-id']) {
    organizationSlug = req.headers['x-organization-id'];
  }

  // Priority 3: Check URL parameter
  if (!organizationId && !organizationSlug && req.params.organizationSlug) {
    organizationSlug = req.params.organizationSlug;
  }

  // Priority 4: Check subdomain (e.g., nairobi.countypay.com)
  if (!organizationId && !organizationSlug) {
    const host = req.hostname;
    const parts = host.split('.');
    if (parts.length > 2) {
      organizationSlug = parts[0];
    }
  }

  // If we have a slug, resolve it to ID
  if (organizationSlug && !organizationId) {
    const organization = await prisma.organization.findUnique({
      where: { slug: organizationSlug }
    });
    if (organization) {
      organizationId = organization.id;
    }
  }

  return organizationId;
}

/**
 * Tenant middleware - Ensures user belongs to organization
 */
function tenantMiddleware(authCheck = true) {
  return async (req, res, next) => {
    try {
      const organizationId = await resolveTenant(req);

      if (!organizationId) {
        return res.status(400).json({
          code: 'MISSING_ORGANIZATION',
          message: 'Organization not specified. Use X-Organization-Id header or organizationSlug in URL.'
        });
      }

      // Verify user belongs to organization (unless explicitly skipped)
      if (authCheck && req.user?.organizationId && req.user.organizationId !== organizationId) {
        return res.status(403).json({
          code: 'ORGANIZATION_MISMATCH',
          message: 'Access denied: You do not belong to this organization'
        });
      }

      // Attach to request
      req.organizationId = organizationId;
      req.tenant = { id: organizationId };

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Query builder that automatically filters by organization
 */
function withOrganization(organizationId) {
  return {
    // Add organizationId to where clause
    filter: (where = {}) => ({
      ...where,
      organizationId
    })
  };
}

/**
 * Verify user has access to resource in organization
 */
async function verifyResourceAccess(userId, organizationId, resourceType, resourceId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true, role: true }
  });

  // User must belong to same organization
  if (!user || user.organizationId !== organizationId) {
    throw new Error('Access denied: Resource not found');
  }

  return true;
}

/**
 * Get organization details with user limits check
 */
async function getOrganizationWithLimits(organizationId) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      _count: {
        select: { users: true, counties: true }
      }
    }
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  return {
    ...org,
    limits: {
      users: {
        current: org._count.users,
        max: org.maxUsers,
        available: org.maxUsers - org._count.users
      },
      counties: {
        current: org._count.counties,
        max: org.maxCounties,
        available: org.maxCounties - org._count.counties
      }
    }
  };
}

module.exports = {
  resolveTenant,
  tenantMiddleware,
  withOrganization,
  verifyResourceAccess,
  getOrganizationWithLimits
};
