const prisma = require('../utils/prisma');
const { calculateDistance } = require('../algorithms/conflictEngine');

/**
 * Search and filter available resources
 */
async function getAvailableResources(req, res, next) {
  try {
    const {
      type,
      status = 'AVAILABLE',
      latitude,
      longitude,
      maxDistanceKm = 50
    } = req.query;

    const where = {};
    if (type) {
      where.type = type.toUpperCase();
    }
    if (status) {
      where.status = status.toUpperCase();
    }

    const resources = await prisma.resource.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, phone: true } },
        bookings: {
          where: { status: 'ACTIVE' },
          select: { id: true, startTime: true, endTime: true }
        }
      }
    });

    // Compute distance if coordinates provided
    let results = resources;
    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);

      results = resources.map(resItem => {
        const distanceKm = calculateDistance(userLat, userLon, resItem.latitude, resItem.longitude);
        return {
          ...resItem,
          distanceKm: parseFloat(distanceKm.toFixed(2))
        };
      });

      if (maxDistanceKm) {
        const maxDist = parseFloat(maxDistanceKm);
        results = results.filter(r => r.distanceKm <= maxDist);
      }

      results.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    res.json({
      success: true,
      data: {
        totalFound: results.length,
        resources: results
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single resource details
 */
async function getResourceById(req, res, next) {
  try {
    const { id } = req.params;
    const resource = await prisma.resource.findUnique({
      where: { id: parseInt(id) },
      include: {
        owner: { select: { id: true, name: true, phone: true } },
        bookings: {
          where: { status: 'ACTIVE' },
          orderBy: { startTime: 'asc' }
        },
        disruptions: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    res.json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAvailableResources,
  getResourceById
};
