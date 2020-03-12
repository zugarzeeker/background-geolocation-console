export const server = 'http://localhost:9000';

export const regData = {
  org: 'test',
  uuid: 'uuid',
  model: 'model',
  framework: 'framework',
  manufacturer: 'manufacturer',
  version: '10',
};

export const location = {
  is_moving: false,
  uuid: '03f4aa4c-ed00-4390-9e82-49f0c5799940',
  timestamp: '2020-03-12T19:26:12.020Z',
  timestampMeta: {
    time: 1584041172020,
    systemTime: 1584041176933,
    systemClockElaspsedRealtime: 584834172,
    elapsedRealtime: 584829260,
  },
  odometer: 6454829,
  coords: {
    latitude: 45.5192402,
    longitude: -73.6169874,
    accuracy: 15.9,
    speed: -1,
    heading: -1,
    altitude: 43.8,
  },
  activity: {
    type: 'still',
    confidence: 100,
  },
  battery: {
    is_charging: true,
    level: 0.98,
  },
  extras: { getCurrentPosition: true },
};
