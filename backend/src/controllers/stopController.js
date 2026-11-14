const Stop = require('../models/Stop');
const Route = require('../models/Route');

// @desc    Get all stops or search stops by name
// @route   GET /api/stops
// @access  Public
const getStops = async (req, res, next) => {
  try {
    const { name, search, q } = req.query;
    const searchKeyword = name || search || q;

    let query = {};
    if (searchKeyword) {
      query.stopName = { $regex: searchKeyword.trim(), $options: 'i' };
    }

    const stops = await Stop.find(query).sort({ stopId: 1 });
    res.status(200).json({
      success: true,
      count: stops.length,
      data: stops
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single stop by stopId or mongo _id
// @route   GET /api/stops/:id
// @access  Public
const getStopById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let stop = await Stop.findOne({
      $or: [{ stopId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
    });

    if (!stop) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found'
      });
    }

    res.status(200).json({
      success: true,
      data: stop
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new stop
// @route   POST /api/stops
// @access  Public / Admin
const createStop = async (req, res, next) => {
  try {
    const { stopId, stopName, latitude, longitude, connectedRoutes } = req.body;

    if (!stopId || !stopName) {
      return res.status(400).json({
        success: false,
        message: 'Both stopId and stopName are required'
      });
    }

    const existingStop = await Stop.findOne({ stopId });
    if (existingStop) {
      return res.status(400).json({
        success: false,
        message: `Stop with stopId '${stopId}' already exists`
      });
    }

    const stop = await Stop.create({
      stopId,
      stopName,
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
      connectedRoutes: Array.isArray(connectedRoutes) ? connectedRoutes : []
    });

    res.status(201).json({
      success: true,
      message: 'Stop created successfully',
      data: stop
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update stop by stopId or _id
// @route   PUT /api/stops/:id
// @access  Public / Admin
const updateStop = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stopName, latitude, longitude, connectedRoutes } = req.body;

    let stop = await Stop.findOne({
      $or: [{ stopId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
    });

    if (!stop) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found'
      });
    }

    if (stopName !== undefined) stop.stopName = stopName;
    if (latitude !== undefined) stop.latitude = Number(latitude);
    if (longitude !== undefined) stop.longitude = Number(longitude);
    if (connectedRoutes !== undefined && Array.isArray(connectedRoutes)) {
      stop.connectedRoutes = connectedRoutes;
    }

    await stop.save();

    res.status(200).json({
      success: true,
      message: 'Stop updated successfully',
      data: stop
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete stop by stopId or _id
// @route   DELETE /api/stops/:id
// @access  Public / Admin
const deleteStop = async (req, res, next) => {
  try {
    const { id } = req.params;

    let stop = await Stop.findOne({
      $or: [{ stopId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
    });

    if (!stop) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found'
      });
    }

    // Safety Check (Section 12): Verify if stop is currently used by any active routes
    const connectedRoutes = await Route.find({ stops: stop.stopId });
    if (connectedRoutes.length > 0) {
      const routeNumbers = connectedRoutes.map((r) => r.routeNumber).join(', ');
      return res.status(400).json({
        success: false,
        message: `This stop is currently used by one or more routes (Route ${routeNumbers}). Remove the stop from those routes before deleting it.`
      });
    }

    await Stop.deleteOne({ _id: stop._id });

    res.status(200).json({
      success: true,
      message: `Stop '${stop.stopName}' (${stop.stopId}) deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStops,
  getStopById,
  createStop,
  updateStop,
  deleteStop
};
