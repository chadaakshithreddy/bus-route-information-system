const Route = require('../models/Route');
const Stop = require('../models/Stop');

// Helper to enrich routes with full stop details and ordered sequence
const enrichRouteWithStopDetails = async (route) => {
  const routeObj = route.toObject ? route.toObject() : { ...route };
  if (!routeObj.stops || !Array.isArray(routeObj.stops)) {
    return routeObj;
  }

  // Fetch stop documents for all stopIds in this route
  const stopDocs = await Stop.find({ stopId: { $in: routeObj.stops } });
  const stopMap = new Map();
  stopDocs.forEach((s) => stopMap.set(s.stopId, s));

  // Map stops preserving exact route sequence
  const stopSequence = routeObj.stops.map((sid, index) => {
    const sDoc = stopMap.get(sid);
    return {
      sequence: index + 1,
      stopId: sid,
      stopName: sDoc ? sDoc.stopName : sid,
      latitude: sDoc ? sDoc.latitude : null,
      longitude: sDoc ? sDoc.longitude : null
    };
  });

  return {
    ...routeObj,
    stopDetails: stopSequence,
    stopSequenceSummary: stopSequence.map((s) => s.stopName).join(' ↓ ')
  };
};

// @desc    Get all routes (with optional filtering)
// @route   GET /api/routes
// @access  Public
const getRoutes = async (req, res, next) => {
  try {
    const routes = await Route.find().sort({ routeNumber: 1 });
    const enriched = await Promise.all(routes.map(enrichRouteWithStopDetails));

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single route by routeId or mongo _id
// @route   GET /api/routes/:id
// @access  Public
const getRouteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const route = await Route.findOne({
      $or: [{ routeId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    const enriched = await enrichRouteWithStopDetails(route);

    res.status(200).json({
      success: true,
      data: enriched
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search routes by route number or stop name
// @route   GET /api/routes/search
// @access  Public
const searchRoutes = async (req, res, next) => {
  try {
    const { routeNumber, stopName, q } = req.query;

    if (!routeNumber && !stopName && !q) {
      return res.status(400).json({
        success: false,
        message: 'Please provide routeNumber, stopName, or q search parameter'
      });
    }

    let filter = {};

    if (routeNumber) {
      filter.routeNumber = { $regex: routeNumber.trim(), $options: 'i' };
    }

    if (stopName) {
      // Find stops matching this name
      const matchingStops = await Stop.find({
        stopName: { $regex: stopName.trim(), $options: 'i' }
      });
      const stopIds = matchingStops.map((s) => s.stopId);

      filter.$or = [
        { stops: { $in: stopIds } },
        { startStop: { $regex: stopName.trim(), $options: 'i' } },
        { endStop: { $regex: stopName.trim(), $options: 'i' } }
      ];
    }

    if (q) {
      const keyword = q.trim();
      // Find matching stops for general query
      const matchingStops = await Stop.find({
        stopName: { $regex: keyword, $options: 'i' }
      });
      const stopIds = matchingStops.map((s) => s.stopId);

      filter.$or = [
        { routeNumber: { $regex: keyword, $options: 'i' } },
        { routeId: { $regex: keyword, $options: 'i' } },
        { startStop: { $regex: keyword, $options: 'i' } },
        { endStop: { $regex: keyword, $options: 'i' } },
        { stops: { $in: stopIds } }
      ];
    }

    const routes = await Route.find(filter).sort({ routeNumber: 1 });
    const enriched = await Promise.all(routes.map(enrichRouteWithStopDetails));

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Find routes between two stops
// @route   GET /api/routes/path
// @access  Public
const findRouteBetweenStops = async (req, res, next) => {
  try {
    const fromStopId = req.query.fromStopId || req.query.from;
    const toStopId = req.query.toStopId || req.query.to;

    if (!fromStopId || !toStopId) {
      return res.status(400).json({
        success: false,
        message: 'Both fromStopId and toStopId query parameters are required'
      });
    }

    // Required database search logic using $all
    const routes = await Route.find({
      stops: {
        $all: [fromStopId, toStopId]
      }
    });

    if (!routes || routes.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No route found between the selected stops',
        routes: []
      });
    }

    // Format and enrich matching routes according to Section 11
    const enrichedRoutes = await Promise.all(
      routes.map(async (r) => {
        const enriched = await enrichRouteWithStopDetails(r);
        const stopsList = enriched.stopDetails || [];

        const fromIndex = r.stops.indexOf(fromStopId);
        const toIndex = r.stops.indexOf(toStopId);

        // Subsequence of stops between from and to
        let tripStops = [];
        if (fromIndex !== -1 && toIndex !== -1 && fromIndex <= toIndex) {
          tripStops = stopsList.slice(fromIndex, toIndex + 1);
        } else if (fromIndex !== -1 && toIndex !== -1 && fromIndex > toIndex) {
          tripStops = stopsList.slice(toIndex, fromIndex + 1).reverse();
        }

        return {
          routeId: r.routeId,
          routeNumber: r.routeNumber,
          startStop: r.startStop,
          endStop: r.endStop,
          distance: r.distance,
          duration: r.duration,
          firstTrip: r.timings.firstTrip,
          lastTrip: r.timings.lastTrip,
          stops: r.stops,
          stopDetails: stopsList,
          tripStops: tripStops,
          stopSequenceDisplay: stopsList.map((s) => s.stopName).join(' ↓ ')
        };
      })
    );

    res.status(200).json({
      success: true,
      message: `Found ${enrichedRoutes.length} matching route(s)`,
      routes: enrichedRoutes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new route
// @route   POST /api/routes
// @access  Public / Admin
const createRoute = async (req, res, next) => {
  try {
    const {
      routeId,
      routeNumber,
      startStop,
      endStop,
      distance,
      duration,
      stops,
      timings
    } = req.body;

    // 1. Validate required fields
    if (
      !routeNumber ||
      !startStop ||
      !endStop ||
      distance === undefined ||
      duration === undefined ||
      !stops ||
      !timings
    ) {
      return res.status(400).json({
        success: false,
        message:
          'routeNumber, startStop, endStop, distance, duration, stops, and timings are required'
      });
    }

    // 2. Validate timings object
    if (!timings.firstTrip || !timings.lastTrip) {
      return res.status(400).json({
        success: false,
        message: 'timings must contain both firstTrip and lastTrip'
      });
    }

    // 3. Validate stops is an array with at least 2 stops
    if (!Array.isArray(stops) || stops.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'A route must contain at least 2 stops'
      });
    }

    // 4. Validate unique routeNumber
    const existingRouteNumber = await Route.findOne({ routeNumber });
    if (existingRouteNumber) {
      return res.status(400).json({
        success: false,
        message: `Route with routeNumber '${routeNumber}' already exists`
      });
    }

    // Assign routeId if not provided
    const finalRouteId = routeId ? routeId.trim() : `R${routeNumber.replace(/\s+/g, '')}`;

    const existingRouteId = await Route.findOne({ routeId: finalRouteId });
    if (existingRouteId) {
      return res.status(400).json({
        success: false,
        message: `Route with routeId '${finalRouteId}' already exists`
      });
    }

    const route = await Route.create({
      routeId: finalRouteId,
      routeNumber,
      startStop,
      endStop,
      distance: Number(distance),
      duration: Number(duration),
      stops,
      timings: {
        firstTrip: timings.firstTrip,
        lastTrip: timings.lastTrip
      }
    });

    // 5. Update connectedRoutes in all included stops
    await Stop.updateMany(
      { stopId: { $in: stops } },
      { $addToSet: { connectedRoutes: finalRouteId } }
    );

    const enriched = await enrichRouteWithStopDetails(route);

    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      data: enriched
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update route by routeId or _id
// @route   PUT /api/routes/:id
// @access  Public / Admin
const updateRoute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      routeNumber,
      startStop,
      endStop,
      distance,
      duration,
      stops,
      timings
    } = req.body;

    let route = await Route.findOne({
      $or: [{ routeId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check unique routeNumber if updating it
    if (routeNumber && routeNumber !== route.routeNumber) {
      const existing = await Route.findOne({ routeNumber });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Route with routeNumber '${routeNumber}' already exists`
        });
      }
      route.routeNumber = routeNumber;
    }

    if (startStop) route.startStop = startStop;
    if (endStop) route.endStop = endStop;
    if (distance !== undefined) route.distance = Number(distance);
    if (duration !== undefined) route.duration = Number(duration);

    if (timings) {
      if (timings.firstTrip) route.timings.firstTrip = timings.firstTrip;
      if (timings.lastTrip) route.timings.lastTrip = timings.lastTrip;
    }

    // Handle stops array update and synchronization of connectedRoutes
    if (stops !== undefined) {
      if (!Array.isArray(stops) || stops.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'A route must contain at least 2 stops'
        });
      }

      const oldStops = route.stops;
      route.stops = stops;

      // Remove routeId from stops no longer on this route
      const removedStops = oldStops.filter((s) => !stops.includes(s));
      if (removedStops.length > 0) {
        await Stop.updateMany(
          { stopId: { $in: removedStops } },
          { $pull: { connectedRoutes: route.routeId } }
        );
      }

      // Add routeId to newly added stops
      const addedStops = stops.filter((s) => !oldStops.includes(s));
      if (addedStops.length > 0) {
        await Stop.updateMany(
          { stopId: { $in: addedStops } },
          { $addToSet: { connectedRoutes: route.routeId } }
        );
      }
    }

    await route.save();
    const enriched = await enrichRouteWithStopDetails(route);

    res.status(200).json({
      success: true,
      message: 'Route updated successfully',
      data: enriched
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete route by routeId or _id
// @route   DELETE /api/routes/:id
// @access  Public / Admin
const deleteRoute = async (req, res, next) => {
  try {
    const { id } = req.params;

    const route = await Route.findOne({
      $or: [{ routeId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Remove routeId from connectedRoutes across all stops
    await Stop.updateMany(
      { connectedRoutes: route.routeId },
      { $pull: { connectedRoutes: route.routeId } }
    );

    await Route.deleteOne({ _id: route._id });

    res.status(200).json({
      success: true,
      message: `Route '${route.routeNumber}' (${route.routeId}) deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get real-time dashboard statistics (Section 3 & 18)
// @route   GET /api/routes/stats/dashboard
// @access  Public / Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const totalRoutes = await Route.countDocuments();
    const totalStops = await Stop.countDocuments();
    const activeRoutes = totalRoutes;
    const Feedback = require('../models/Feedback');
    const totalFeedback = await Feedback.countDocuments();

    // Find route with most stops
    const allRoutes = await Route.find().select('routeNumber startStop endStop stops distance duration');
    let routeWithMostStops = null;
    let maxStopsCount = 0;
    allRoutes.forEach((r) => {
      if (r.stops && r.stops.length > maxStopsCount) {
        maxStopsCount = r.stops.length;
        routeWithMostStops = {
          routeNumber: r.routeNumber,
          startStop: r.startStop,
          endStop: r.endStop,
          stopsCount: maxStopsCount,
          distance: r.distance
        };
      }
    });

    // Top connected stops
    const allStops = await Stop.find().select('stopId stopName connectedRoutes');
    const topStops = allStops
      .map((s) => ({
        stopId: s.stopId,
        stopName: s.stopName,
        routesCount: (s.connectedRoutes || []).length
      }))
      .sort((a, b) => b.routesCount - a.routesCount)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        totalRoutes,
        totalStops,
        activeRoutes,
        totalFeedback,
        routeWithMostStops,
        topConnectedStops: topStops
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoutes,
  getRouteById,
  searchRoutes,
  findRouteBetweenStops,
  createRoute,
  updateRoute,
  deleteRoute,
  getDashboardStats
};
