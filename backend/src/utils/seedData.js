const dotenv = require('dotenv');
dotenv.config();

const { connectDB, disconnectDB } = require('../config/db');
const Stop = require('../models/Stop');
const Route = require('../models/Route');
const User = require('../models/User');
const Feedback = require('../models/Feedback');

// 54 Realistic Hanamkonda / Warangal / Hasanparthy / Kazipet locations & stops
const sampleStops = [
  {
    stopId: 'S001',
    stopName: 'Hanamkonda Bus Station',
    latitude: 17.9972,
    longitude: 79.5606
  },
  {
    stopId: 'S002',
    stopName: 'Hanamkonda Chowrasta',
    latitude: 17.9994,
    longitude: 79.5645
  },
  {
    stopId: 'S003',
    stopName: 'Thousand Pillar Temple',
    latitude: 18.0035,
    longitude: 79.5742
  },
  {
    stopId: 'S004',
    stopName: 'Padmakshi Temple',
    latitude: 18.0062,
    longitude: 79.5670
  },
  {
    stopId: 'S005',
    stopName: 'Bhadrakali Temple',
    latitude: 17.9868,
    longitude: 79.5855
  },
  {
    stopId: 'S006',
    stopName: 'Regional Science Center',
    latitude: 18.0015,
    longitude: 79.5880
  },
  {
    stopId: 'S007',
    stopName: 'Vana Vigyan Park',
    latitude: 18.0160,
    longitude: 79.5910
  },
  {
    stopId: 'S008',
    stopName: 'Kakatiya Musical Garden',
    latitude: 17.9840,
    longitude: 79.5895
  },
  {
    stopId: 'S009',
    stopName: 'Warangal Planetarium',
    latitude: 17.9810,
    longitude: 79.5930
  },
  {
    stopId: 'S010',
    stopName: 'Warangal Fort',
    latitude: 17.9555,
    longitude: 79.6178
  },
  {
    stopId: 'S011',
    stopName: 'Kakatiya Rock Garden',
    latitude: 17.9620,
    longitude: 79.6105
  },
  {
    stopId: 'S012',
    stopName: 'Warangal Railway Station',
    latitude: 17.9785,
    longitude: 79.6012
  },
  {
    stopId: 'S013',
    stopName: 'Kazipet Railway Station',
    latitude: 17.9811,
    longitude: 79.5218
  },
  {
    stopId: 'S014',
    stopName: 'Kazipet Junction',
    latitude: 17.9830,
    longitude: 79.5250
  },
  {
    stopId: 'S015',
    stopName: 'Subedari',
    latitude: 17.9950,
    longitude: 79.5480
  },
  {
    stopId: 'S016',
    stopName: 'Naimnagar',
    latitude: 18.0080,
    longitude: 79.5610
  },
  {
    stopId: 'S017',
    stopName: 'KU X Road',
    latitude: 18.0195,
    longitude: 79.5540
  },
  {
    stopId: 'S018',
    stopName: 'Kakatiya University',
    latitude: 18.0289,
    longitude: 79.5412
  },
  {
    stopId: 'S019',
    stopName: 'University Arts & Science College',
    latitude: 17.9975,
    longitude: 79.5460
  },
  {
    stopId: 'S020',
    stopName: 'Bheemaram',
    latitude: 18.0310,
    longitude: 79.5510
  },
  {
    stopId: 'S021',
    stopName: 'Hasanparthy',
    latitude: 18.0585,
    longitude: 79.5420
  },
  {
    stopId: 'S022',
    stopName: 'Ananthasagar',
    latitude: 18.0720,
    longitude: 79.5310
  },
  {
    stopId: 'S023',
    stopName: 'Ananthasagar X Road',
    latitude: 18.0700,
    longitude: 79.5340
  },
  {
    stopId: 'S024',
    stopName: 'SR University Main Gate',
    latitude: 18.0735,
    longitude: 79.5295
  },
  {
    stopId: 'S025',
    stopName: 'SR University',
    latitude: 18.0750,
    longitude: 79.5280
  },
  {
    stopId: 'S026',
    stopName: 'Madikonda',
    latitude: 17.9625,
    longitude: 79.4890
  },
  {
    stopId: 'S027',
    stopName: 'Dharmasagar',
    latitude: 18.0150,
    longitude: 79.4680
  },
  {
    stopId: 'S028',
    stopName: 'Chinthagattu',
    latitude: 18.0420,
    longitude: 79.5620
  },
  {
    stopId: 'S029',
    stopName: 'Yellapur',
    latitude: 18.0650,
    longitude: 79.5600
  },
  {
    stopId: 'S030',
    stopName: 'Seethampet X Road',
    latitude: 18.0380,
    longitude: 79.5450
  },
  {
    stopId: 'S031',
    stopName: 'Railway Colony',
    latitude: 17.9850,
    longitude: 79.5280
  },
  {
    stopId: 'S032',
    stopName: 'Ashoka Complex',
    latitude: 17.9980,
    longitude: 79.5590
  },
  {
    stopId: 'S033',
    stopName: 'Mission Hospital',
    latitude: 17.9960,
    longitude: 79.5630
  },
  {
    stopId: 'S034',
    stopName: 'District Court',
    latitude: 17.9930,
    longitude: 79.5510
  },
  {
    stopId: 'S035',
    stopName: 'Public Garden',
    latitude: 18.0010,
    longitude: 79.5700
  },
  {
    stopId: 'S036',
    stopName: 'Nakkala Gutta',
    latitude: 18.0020,
    longitude: 79.5550
  },
  {
    stopId: 'S037',
    stopName: 'Kishanpura',
    latitude: 18.0090,
    longitude: 79.5670
  },
  {
    stopId: 'S038',
    stopName: 'Green Square Plaza',
    latitude: 18.0005,
    longitude: 79.5620
  },
  {
    stopId: 'S039',
    stopName: 'Petrol Pump',
    latitude: 17.9990,
    longitude: 79.5580
  },
  {
    stopId: 'S040',
    stopName: 'Subedari District Bus Stop',
    latitude: 17.9945,
    longitude: 79.5470
  },
  {
    stopId: 'S041',
    stopName: 'Vaddepalli',
    latitude: 18.0050,
    longitude: 79.5390
  },
  {
    stopId: 'S042',
    stopName: 'Srinagar Colony',
    latitude: 18.0090,
    longitude: 79.5350
  },
  {
    stopId: 'S043',
    stopName: 'Teachers Colony',
    latitude: 18.0120,
    longitude: 79.5320
  },
  {
    stopId: 'S044',
    stopName: 'Rangampet',
    latitude: 17.9750,
    longitude: 79.5980
  },
  {
    stopId: 'S045',
    stopName: 'Hanuman Nagar',
    latitude: 18.0160,
    longitude: 79.5280
  },
  {
    stopId: 'S046',
    stopName: 'Vidyaranyapuri',
    latitude: 18.0220,
    longitude: 79.5350
  },
  {
    stopId: 'S047',
    stopName: 'Gopalpur',
    latitude: 18.0280,
    longitude: 79.5680
  },
  {
    stopId: 'S048',
    stopName: 'Pegadapally Road',
    latitude: 18.0450,
    longitude: 79.5580
  },
  {
    stopId: 'S049',
    stopName: 'University Colony',
    latitude: 18.0330,
    longitude: 79.5380
  },
  {
    stopId: 'S050',
    stopName: 'Kothawada',
    latitude: 17.9820,
    longitude: 79.6100
  },
  {
    stopId: 'S051',
    stopName: 'Warangal Bus Station',
    latitude: 17.9760,
    longitude: 79.6040
  },
  {
    stopId: 'S052',
    stopName: 'Pochamma Maidan',
    latitude: 17.9890,
    longitude: 79.5950
  },
  {
    stopId: 'S053',
    stopName: 'MGM Hospital',
    latitude: 17.9840,
    longitude: 79.6010
  },
  {
    stopId: 'S054',
    stopName: 'NIT Warangal',
    latitude: 17.9835,
    longitude: 79.5310
  }
];

// 10 Realistic Demo Transit Routes connecting Hanamkonda, Warangal, Kazipet & SR University
const sampleRoutes = [
  {
    routeId: 'R101',
    routeNumber: '101',
    startStop: 'Hanamkonda Bus Station',
    endStop: 'SR University',
    distance: 16.5,
    duration: 40,
    stops: ['S001', 'S002', 'S016', 'S017', 'S020', 'S021', 'S022', 'S025'],
    timings: {
      firstTrip: '06:00 AM',
      lastTrip: '09:30 PM'
    }
  },
  {
    routeId: 'R102',
    routeNumber: '102',
    startStop: 'Hanamkonda Bus Station',
    endStop: 'Bheemaram',
    distance: 11.0,
    duration: 30,
    stops: ['S001', 'S015', 'S036', 'S037', 'S018', 'S017', 'S020'],
    timings: {
      firstTrip: '06:30 AM',
      lastTrip: '10:00 PM'
    }
  },
  {
    routeId: 'R103',
    routeNumber: '103',
    startStop: 'Warangal Railway Station',
    endStop: 'Kazipet Railway Station',
    distance: 15.0,
    duration: 45,
    stops: ['S012', 'S051', 'S052', 'S002', 'S001', 'S015', 'S013'],
    timings: {
      firstTrip: '05:30 AM',
      lastTrip: '10:30 PM'
    }
  },
  {
    routeId: 'R104',
    routeNumber: '104',
    startStop: 'Hanamkonda Bus Station',
    endStop: 'Warangal Railway Station',
    distance: 12.5,
    duration: 35,
    stops: ['S001', 'S003', 'S004', 'S005', 'S008', 'S012'],
    timings: {
      firstTrip: '06:15 AM',
      lastTrip: '09:00 PM'
    }
  },
  {
    routeId: 'R105',
    routeNumber: '105',
    startStop: 'Hanamkonda Bus Station',
    endStop: 'SR University',
    distance: 18.0,
    duration: 45,
    stops: ['S001', 'S016', 'S020', 'S028', 'S021', 'S022', 'S025'],
    timings: {
      firstTrip: '06:15 AM',
      lastTrip: '09:45 PM'
    }
  },
  {
    routeId: 'R106',
    routeNumber: '106',
    startStop: 'Hanamkonda Bus Station',
    endStop: 'Vidyaranyapuri',
    distance: 9.5,
    duration: 25,
    stops: ['S001', 'S015', 'S041', 'S042', 'S043', 'S045', 'S046'],
    timings: {
      firstTrip: '06:45 AM',
      lastTrip: '09:15 PM'
    }
  },
  {
    routeId: 'R107',
    routeNumber: '107',
    startStop: 'Kazipet Railway Station',
    endStop: 'SR University',
    distance: 19.5,
    duration: 50,
    stops: ['S013', 'S026', 'S027', 'S021', 'S022', 'S025'],
    timings: {
      firstTrip: '06:00 AM',
      lastTrip: '08:30 PM'
    }
  },
  {
    routeId: 'R108',
    routeNumber: '108',
    startStop: 'Warangal Railway Station',
    endStop: 'Hanamkonda Bus Station',
    distance: 13.0,
    duration: 35,
    stops: ['S012', 'S010', 'S011', 'S005', 'S002', 'S001'],
    timings: {
      firstTrip: '07:00 AM',
      lastTrip: '09:00 PM'
    }
  },
  {
    routeId: 'R109',
    routeNumber: '109',
    startStop: 'Hanamkonda Bus Station',
    endStop: 'SR University',
    distance: 17.0,
    duration: 42,
    stops: ['S001', 'S002', 'S016', 'S017', 'S024', 'S025'],
    timings: {
      firstTrip: '07:15 AM',
      lastTrip: '08:45 PM'
    }
  },
  {
    routeId: 'R110',
    routeNumber: '110',
    startStop: 'Kazipet Railway Station',
    endStop: 'Kakatiya University',
    distance: 10.5,
    duration: 28,
    stops: ['S013', 'S014', 'S054', 'S015', 'S034', 'S019', 'S018'],
    timings: {
      firstTrip: '06:00 AM',
      lastTrip: '10:00 PM'
    }
  }
];

const sampleUsers = [
  {
    userId: 'U001',
    name: 'System Admin',
    email: 'admin@busroute.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    userId: 'U002',
    name: 'Jane Passenger',
    email: 'passenger@busroute.com',
    password: 'user123',
    role: 'user'
  }
];

const sampleFeedback = [
  {
    feedbackId: 'FB001',
    userId: 'U002',
    routeId: 'R101',
    message: 'Route 101 to SR University is very punctual and convenient for students.'
  },
  {
    feedbackId: 'FB002',
    userId: 'U002',
    routeId: 'R107',
    message: 'Direct bus from Kazipet Railway Station to SR University saves a lot of travel time.'
  }
];

const seedData = async (exitAfter = true) => {
  try {
    await connectDB();

    console.log('[Seed] Synchronizing connected routes across stops...');
    const stopRouteMap = {};
    sampleRoutes.forEach((route) => {
      route.stops.forEach((stopId) => {
        if (!stopRouteMap[stopId]) stopRouteMap[stopId] = new Set();
        stopRouteMap[stopId].add(route.routeId);
      });
    });

    const preparedStops = sampleStops.map((stop) => ({
      ...stop,
      connectedRoutes: Array.from(stopRouteMap[stop.stopId] || [])
    }));

    console.log('[Seed] Clearing existing collections for clean demo reset...');
    await Stop.deleteMany({});
    await Route.deleteMany({});
    await User.deleteMany({});
    await Feedback.deleteMany({});

    console.log(`[Seed] Inserting ${preparedStops.length} Hanamkonda & Warangal stops...`);
    await Stop.insertMany(preparedStops);

    console.log(`[Seed] Inserting ${sampleRoutes.length} interconnected transit routes...`);
    await Route.insertMany(sampleRoutes);

    console.log('[Seed] Inserting admin and demo users...');
    for (const u of sampleUsers) {
      await User.create(u);
    }

    console.log('[Seed] Inserting sample Feedback...');
    await Feedback.insertMany(sampleFeedback);

    console.log('==================================================');
    console.log(' Seeding database complete!                       ');
    console.log(` ✓ Stops inserted: ${preparedStops.length} (including SR University S025)`);
    console.log(` ✓ Routes inserted: ${sampleRoutes.length} (Routes 101-110)`);
    console.log(' ✓ Route relationships and connectedRoutes created');
    console.log(' ✓ SR University connected to multiple routes');
    console.log('==================================================');

    if (exitAfter) {
      await disconnectDB();
      process.exit(0);
    }
  } catch (error) {
    console.error(`[Seed] Error loading sample data: ${error.message}`);
    if (exitAfter) {
      await disconnectDB();
      process.exit(1);
    }
    throw error;
  }
};

if (require.main === module) {
  seedData();
}

module.exports = { seedData, sampleStops, sampleRoutes, sampleUsers, sampleFeedback };
