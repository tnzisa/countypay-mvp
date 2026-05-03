/**
 * Organizations Routes - Multi-tenancy management
 * All endpoints require superadmin role for organization management
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { tenantMiddleware, getOrganizationWithLimits } = require('../middleware/tenantMiddleware');
const { prisma } = require('../lib/prisma');

const router = express.Router();

/**
 * Middleware to verify superadmin role
 */
function superAdminOnly(req, res, next) {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Superadmin access required'
    });
  }
  next();
}

/**
 * Create new organization (superadmin only)
 * POST /api/organizations
 */
router.post('/', authMiddleware, superAdminOnly, async (req, res, next) => {
  try {
    const { name, slug, description, tier = 'STARTER' } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'name and slug are required'
      });
    }

    // Check if slug is unique
    const existing = await prisma.organization.findUnique({
      where: { slug }
    });

    if (existing) {
      return res.status(409).json({
        code: 'RESOURCE_ALREADY_EXISTS',
        message: `Organization with slug "${slug}" already exists`
      });
    }

    const tierLimits = {
      STARTER: { maxUsers: 10, maxCounties: 5 },
      PROFESSIONAL: { maxUsers: 50, maxCounties: 20 },
      ENTERPRISE: { maxUsers: 500, maxCounties: 100 }
    };

    const limits = tierLimits[tier] || tierLimits.STARTER;

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        description,
        tier,
        maxUsers: limits.maxUsers,
        maxCounties: limits.maxCounties
      }
    });

    res.status(201).json({ organization });
  } catch (error) {
    next(error);
  }
});

/**
 * Get organization details
 * GET /api/organizations/:slug
 */
router.get('/:slug', authMiddleware, async (req, res, next) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { slug: req.params.slug },
      include: {
        _count: {
          select: { users: true, counties: true, transactions: true }
        }
      }
    });

    if (!organization) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Organization not found'
      });
    }

    // Check if user belongs to organization (unless superadmin)
    if (req.user?.role !== 'superadmin' && req.user?.organizationId !== organization.id) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Access denied'
      });
    }

    res.json({
      organization: {
        ...organization,
        stats: organization._count
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get organization with limits
 * GET /api/organizations/:slug/limits
 */
router.get('/:slug/limits', authMiddleware, async (req, res, next) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: req.params.slug }
    });

    if (!org) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Organization not found'
      });
    }

    const orgWithLimits = await getOrganizationWithLimits(org.id);
    res.json({ organization: orgWithLimits });
  } catch (error) {
    next(error);
  }
});

/**
 * Update organization (admin or superadmin)
 * PATCH /api/organizations/:slug
 */
router.patch('/:slug', authMiddleware, async (req, res, next) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { slug: req.params.slug }
    });

    if (!organization) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Organization not found'
      });
    }

    // Check authorization
    const isOrgAdmin = req.user?.organizationId === organization.id && 
                       (req.user?.role === 'county_admin' || req.user?.role === 'superadmin');
    const isSuperAdmin = req.user?.role === 'superadmin';

    if (!isOrgAdmin && !isSuperAdmin) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Access denied'
      });
    }

    const { name, description, status, tier } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (status && isSuperAdmin) updateData.status = status;
    if (tier && isSuperAdmin) updateData.tier = tier;

    const updated = await prisma.organization.update({
      where: { id: organization.id },
      data: updateData
    });

    res.json({ organization: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * List organizations (superadmin only)
 * GET /api/organizations
 */
router.get('/', authMiddleware, superAdminOnly, async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, status = null } = req.query;

    const where = {};
    if (status) where.status = status;

    const organizations = await prisma.organization.findMany({
      where,
      include: {
        _count: {
          select: { users: true, counties: true, transactions: true }
        }
      },
      take: Math.min(parseInt(limit), 100),
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      organizations: organizations.map(org => ({
        ...org,
        stats: org._count
      })),
      count: organizations.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete organization (superadmin only)
 * DELETE /api/organizations/:slug
 */
router.delete('/:slug', authMiddleware, superAdminOnly, async (req, res, next) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { slug: req.params.slug }
    });

    if (!organization) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Organization not found'
      });
    }

    // Check if organization has transactions
    const transactionCount = await prisma.transaction.count({
      where: { organizationId: organization.id }
    });

    if (transactionCount > 0) {
      return res.status(409).json({
        code: 'CONFLICT',
        message: 'Cannot delete organization with transactions. Archive instead.',
        transactionCount
      });
    }

    // Delete related data
    await prisma.organization.delete({
      where: { id: organization.id }
    });

    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
