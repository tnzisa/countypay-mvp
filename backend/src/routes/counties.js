const express = require('express');
const { prisma } = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all counties
router.get('/', async (req, res) => {
  try {
    const counties = await prisma.county.findMany({
      include: {
        fees: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    res.json({ counties });
  } catch (error) {
    console.error('Get counties error:', error);
    res.status(500).json({ error: 'Failed to fetch counties', details: error.message });
  }
});

// Get single county by ID
router.get('/:id', async (req, res) => {
  try {
    const county = await prisma.county.findUnique({
      where: { id: req.params.id },
      include: {
        fees: true
      }
    });
    
    if (!county) {
      return res.status(404).json({ error: 'County not found' });
    }
    
    res.json({ county });
  } catch (error) {
    console.error('Get county error:', error);
    res.status(500).json({ error: 'Failed to fetch county', details: error.message });
  }
});

// Get fees for a specific county
router.get('/:id/fees', async (req, res) => {
  try {
    const fees = await prisma.fee.findMany({
      where: { countyId: req.params.id },
      include: {
        county: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    res.json({ fees });
  } catch (error) {
    console.error('Get fees error:', error);
    res.status(500).json({ error: 'Failed to fetch fees', details: error.message });
  }
});

// Create new county (Admin only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { name, code } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }
    
    const county = await prisma.county.create({
      data: { name, code }
    });
    
    res.status(201).json({ county });
  } catch (error) {
    console.error('Create county error:', error);
    res.status(500).json({ error: 'Failed to create county', details: error.message });
  }
});

// Create new fee for a county (Admin only)
router.post('/:id/fees', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { name, description, amount } = req.body;
    const countyId = req.params.id;
    
    if (!name || !amount) {
      return res.status(400).json({ error: 'Name and amount are required' });
    }
    
    // Verify county exists
    const county = await prisma.county.findUnique({ where: { id: countyId } });
    if (!county) {
      return res.status(404).json({ error: 'County not found' });
    }
    
    const fee = await prisma.fee.create({
      data: {
        name,
        description,
        amount: parseFloat(amount),
        countyId
      },
      include: {
        county: true
      }
    });
    
    res.status(201).json({ fee });
  } catch (error) {
    console.error('Create fee error:', error);
    res.status(500).json({ error: 'Failed to create fee', details: error.message });
  }
});

module.exports = router;

// Made with Bob
