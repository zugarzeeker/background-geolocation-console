import Promise from 'bluebird';
import CompanyModel from '../database/CompanyModel';
import DeviceModel from '../database/DeviceModel';
import LocationModel from '../database/LocationModel';
import { findOrCreate } from './Device';
import {
  AccessDeniedError,
  hydrate,
  isDeniedCompany,
  isDeniedDevice,
  jsonb,
} from '../libs/utils';

const include = [{ model: DeviceModel, as: 'device' }];

export const getStats = async () => {
  const minDate = await LocationModel.min('created_at');
  const maxDate = await LocationModel.max('created_at');
  const total = await LocationModel.count();
  return {
    minDate,
    maxDate,
    total,
  };
};

export const getLocations = async ({ where, limit }) => {
  const rows = await LocationModel.findAll({
    where,
    order: [['recorded_at', 'DESC NULLS LAST']],
    limit,
    include,
  });

  const locations = rows.map(hydrate);
  return locations;
}

export const getLatestLocation = async (where) => {
  const row = await LocationModel.findOne({
    where,
    order: [['recorded_at', 'DESC NULLS LAST']],
    include,
  });
  const result = row ? hydrate(row) : null;
  return result;
};

export const createLocation = async (params, device = {}) => {
  if (Array.isArray(params)) {
    for (let location of params) {
      try {
        await createLocation(location, device);
      } catch (e) {
        throw e;
      }
    }
    return;
  }
  const { company_token: orgToken, id } = device;
  const { location, company_token: token } = params;
  const deviceInfo = params.device || { model: 'UNKNOWN', uuid: 'UNKNOWN' };
  const companyName = orgToken || token || 'UNKNOWN';
  const now = new Date();

  if (isDeniedCompany(companyName)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software.\n' +
      'Why are you spamming my demo server1?\n' +
      'Please email me at chris@transistorsoft.com.'
    );
  }

  const locations = Array.isArray(location) ? location : (location ? [location] : []);

  for (let location of locations) {
    if (isDeniedDevice(deviceInfo.model)) {
      throw new AccessDeniedError(
        'This is a question from the CEO of Transistor Software.\n' +
        'Why are you spamming my demo server2?\n' +
        'Please email me at chris@transistorsoft.com.'
      );
    }

    const currentDevice = id
      ? device
      : await findOrCreate(companyName, { ...deviceInfo });

    CompanyModel.update(
      { updated_at: now },
      { where: { id: currentDevice.company_id } }
    );
    DeviceModel.update(
      { updated_at: now },
      { where: { id: currentDevice.id } }
    );

    console.info(
      'location:create'.green,
      'org:name'.green, companyName,
      'org:id'.green, currentDevice.company_id,
      'device:id'.green, currentDevice.id,
    );

    await LocationModel.create({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      data: jsonb(location),
      recorded_at: location.timestamp,
      created_at: now,
      company_id: currentDevice.company_id,
      device_id: currentDevice.id,
    });
  }
};

export const deleteLocations = async (where) => {
  const verify = { ...where };

  delete verify.recorded_at;

  if (!Object.keys(where).length) {
    throw new Error('Missing some location deletion constraints');
  }

  await LocationModel.destroy({ where: where });

  if (where.device_id) {
    const locationsCount = await LocationModel.count({
      where: verify,
    });
    if (!locationsCount && verify.device_id) {
      await DeviceModel.destroy({
        where: { id: verify.device_id },
      });
    }
  } else if (where.company_id) {
    const devices = await LocationModel.findAll({
      attributes: ['company_id', 'device_id'],
      where: verify,
      group: ['company_id', 'device_id'],
      raw: true,
    });
    const group = {};
    devices.forEach(x => (group[x.company_id] = (group[x.company_id] || []).concat([x.device_id])));
    const queries = Object.keys(group)
      .map(companyId => DeviceModel.destroy({
        where: {
          company_id: +companyId,
          id: { $notIn: group[companyId] },
        },
        cascade: true,
        raw: true,
      }));
    await Promise.reduce(queries, (p, q) => q, 0);
  }
}
