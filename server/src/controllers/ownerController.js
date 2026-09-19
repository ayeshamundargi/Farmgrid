const prisma = require('../utils/prisma');
const { handleDisruption } = require('../algorithms/reallocationEngine');
const { getIO } = require('../socket/socketHandler');

/**
 * Add a new agricultural resource
 */
async function createResource(req, res, next) {
  try {
    const {
      name,
      type,
      description,
      latitude,
      longitude,
      operatingStart = '06:00',
      operatingEnd = '20:00',
      operatorRequired = false,
      fuelRequirement = 'DIESEL'
    } = req.body;

    if (!name || !type || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, latitude, and longitude are required.'
      });
    }

    const resource = await prisma.resource.create({
      data: {
        ownerId: req.user.id,
        name,
        type: type.toUpperCase(),
        description,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        status: 'AVAILABLE',
        maintenanceStatus: 'NORMAL',
        operatingStart,
        operatingEnd,
        operatorRequired: Boolean(operatorRequired),
        fuelRequirement
      }
    });

    const io = getIO();
    if (io) {
      io.emit('resourceStatusChanged', { resourceId: resource.id, status: 'AVAILABLE' });
    }

    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all resources owned by the logged-in owner
 */
async function getMyResources(req, res, next) {
  try {
    const resources = await prisma.resource.findMany({
      where: { ownerId: req.user.id },
      include: {
        bookings: {
          where: { status: 'ACTIVE' },
          include: {
            request: { include: { farm: true, farmer: true } }
          },
          orderBy: { startTime: 'asc' }
        },
        disruptions: {
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      }
    });

    res.json({ success: true, data: resources });
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing resource
 */
async function updateResource(req, res, next) {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      description,
      latitude,
      longitude,
      status,
      maintenanceStatus,
      operatingStart,
      operatingEnd,
      operatorRequired,
      fuelRequirement
    } = req.body;

    const resource = await prisma.resource.findFirst({
      where: { id: parseInt(id), ownerId: req.user.id }
    });

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found or unauthorized.' });
    }

    const updated = await prisma.resource.update({
      where: { id: parseInt(id) },
      data: {
        name: name !== undefined ? name : undefined,
        type: type !== undefined ? type.toUpperCase() : undefined,
        description: description !== undefined ? description : undefined,
        latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
        longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
        status: status !== undefined ? status.toUpperCase() : undefined,
        maintenanceStatus: maintenanceStatus !== undefined ? maintenanceStatus.toUpperCase() : undefined,
        operatingStart: operatingStart !== undefined ? operatingStart : undefined,
        operatingEnd: operatingEnd !== undefined ? operatingEnd : undefined,
        operatorRequired: operatorRequired !== undefined ? Boolean(operatorRequired) : undefined,
        fuelRequirement: fuelRequirement !== undefined ? fuelRequirement : undefined
      }
    });

    const io = getIO();
    if (io) {
      io.emit('resourceStatusChanged', { resourceId: updated.id, status: updated.status });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a resource
 */
async function deleteResource(req, res, next) {
  try {
    const { id } = req.params;

    const resource = await prisma.resource.findFirst({
      where: { id: parseInt(id), ownerId: req.user.id }
    });

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found or unauthorized.' });
    }

    await prisma.resource.delete({ where: { id: parseInt(id) } });

    res.json({ success: true, message: 'Resource deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Get bookings for a specific resource
 */
async function getResourceBookings(req, res, next) {
  try {
    const { id } = req.params;

    const bookings = await prisma.booking.findMany({
      where: { resourceId: parseInt(id) },
      include: {
        request: {
          include: {
            farm: true,
            farmer: { select: { id: true, name: true, phone: true } }
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
}

/**
 * Set maintenance status
 */
async function setMaintenanceStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { maintenanceStatus, status } = req.body;

    const targetMaintenance = maintenanceStatus || 'IN_PROGRESS';
    const targetStatus = status || (targetMaintenance === 'NORMAL' ? 'AVAILABLE' : 'MAINTENANCE');

    const resource = await prisma.resource.update({
      where: { id: parseInt(id) },
      data: {
        maintenanceStatus: targetMaintenance,
        status: targetStatus
      }
    });

    const io = getIO();
    if (io) {
      io.emit('resourceStatusChanged', { resourceId: resource.id, status: resource.status });
    }

    res.json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
}

/**
 * Report resource breakdown -> Automatically triggers Dynamic Reallocation Engine!
 */
async function reportBreakdown(req, res, next) {
  try {
    const { id } = req.params;
    const { title = 'Equipment Mechanical Breakdown', description, reason } = req.body;
    const breakdownDesc = description || reason || 'Reported field failure during operation';

    // Create disruption record
    const disruption = await prisma.disruption.create({
      data: {
        resourceId: parseInt(id),
        type: 'BREAKDOWN',
        title,
        description: breakdownDesc,
        startTime: new Date(),
        severity: 'CRITICAL',
        status: 'ACTIVE'
      }
    });


    // Run dynamic reallocation engine
    const io = getIO();
    const reallocationResult = await handleDisruption(disruption.id, prisma, io);

    res.status(201).json({
      success: true,
      message: 'Breakdown reported and dynamic reallocation completed.',
      data: reallocationResult
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createResource,
  getMyResources,
  updateResource,
  deleteResource,
  getResourceBookings,
  setMaintenanceStatus,
  reportBreakdown
};
