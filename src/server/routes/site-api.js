import { Op } from 'sequelize';
import fs from 'fs';
import { Router } from 'express';
import { isEncryptedRequest, decrypt } from '../libs/RNCrypto';
import {
  AccessDeniedError,
  filterByOrg,
  isAdmin,
  isDDosCompany,
  return1Gbfile,
} from '../libs/utils';
import { getDevices, deleteDevice } from '../models/Device';
import { getOrgs } from '../models/Org';
import {
  createLocation,
  deleteLocations,
  getLatestLocation,
  getLocations,
  getStats,
} from '../models/Location';

const router = new Router();

router.get('/company_tokens', async (req, res) => {
  try {
    const { company_token: org = 'bogus' } = req.query;
    const where = isAdmin(org) ? {} : { company_token: org };
    const orgs = await getOrgs(where);
    res.send(orgs);
  } catch (err) {
    console.error('/company_tokens', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/devices', async (req, res) => {
  try {
    const where = {};
    const { query: params } = req;
    if (filterByOrg) {
      where.company_id = +params.company_id || 1;
    }
    const devices = await getDevices(where);
    res.send(devices);
  } catch (err) {
    console.error('/devices', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.delete('/devices/:id', async (req, res) => {
  console.log(`DELETE /devices/${req.params.id}?${JSON.stringify(req.query)}\n`.green);

  try {
    const { id } = req.params;
    const where = { id, ...req.query };

    await deleteDevice(where);
    res.send({ success: true });
  } catch (err) {
    console.error('/devices', JSON.stringify(req.params), JSON.stringify(req.query), err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.send(stats);
  } catch (err) {
    console.info('/stats', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/locations/latest', async (req, res) => {
  console.log('GET /locations %s'.green, JSON.stringify(req.query));
  try {
    const where = {};
    const { query: params } = req;

    params.device_id && (where.device_id = +params.device_id);

    if (filterByOrg) {
      params.companyId && (where.company_id = +params.companyId);
      params.company_id && (where.company_id = +params.company_id);
      where.company_id = where.company_id || 1;
    }

    const latest = await getLatestLocation(where);
    res.send(latest);
  } catch (err) {
    console.info('/locations/latest', JSON.stringify(req.query), err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/locations', async (req, res) => {
  const where = {};
  const { query: params } = req;
  const {
    end_date: endDate,
    start_date: startDate,
    limit = 1000,
  } = params;

  if (startDate && endDate) {
    where.recorded_at = { [Op.between]: [startDate, endDate] };
  }
  params.device_id && (where.device_id = +params.device_id);
  if (filterByOrg) {
    params.company_id && (where.company_id = +params.company_id);
    where.company_id = where.company_id || 1;
  }
  console.log(
    'GET /locations %s'.green,
    JSON.stringify(req.query),
    JSON.stringify(where),
  );
  try {
    const locations = await getLocations({ where, limit });
    res.send(locations);
  } catch (err) {
    console.info('get /locations', JSON.stringify(req.query), err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.post('/locations', async (req, res) => {
  const { body } = req;
  const data = isEncryptedRequest(req)
    ? decrypt(body.toString())
    : body;
  const locations = Array.isArray(data) ? data : (data ? [data] : []);

  if (locations.find(({ company_token: org }) => isDDosCompany(org))) {
    return return1Gbfile(res);
  }

  try {
    await createLocation(locations);
    res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error('post /locations', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.post('/locations/:company_token', async (req, res) => {
  const { company_token: org } = req.params;

  console.info(
    'locations:post'.green,
    'org:name'.green, org,
  );

  if (isDDosCompany(org)) {
    return return1Gbfile(res);
  }

  const data = (isEncryptedRequest(req)) ? decrypt(req.body.toString()) : req.body;
  data.company_token = org;

  try {
    await createLocation(data);

    res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error('post /locations', org, err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.delete('/locations', async (req, res) => {
  console.info('locations:delete:query'.green, JSON.stringify(req.query));

  try {
    const where = {};
    const { query: params } = req;

    const companyId = params && (params.companyId || params.company_id);
    const deviceId = params && (params.deviceId || params.device_id);

    if (filterByOrg) {
      where.company_id = +companyId || 1;
    }
    where.device_id = +deviceId || 1;
    if (params && params.start_date && params.end_date) {
      where.recorded_at = { [Op.between]: [params.start_date, params.end_date] };
    }

    await deleteLocations(where);

    res.send({ success: true });
  } catch (err) {
    console.info('delete /locations', JSON.stringify(req.query), err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.post('/locations_template', async (req, res) => {
  console.log('POST /locations_template\n%s\n'.green, JSON.stringify(req.body));

  res.set('Retry-After', 5);
  res.send({ success: true });
});

router.post('/configure', async (req, res) => {
  var response = {
    access_token: 'e7ebae5e-4bea-4d63-8f28-8a104acd2f4c',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: '2a69e1cd-d7db-44f6-87fc-3d66c4505ee4',
    scope: 'openid+email+profile+phone+address+group',
  };
  res.send(response);
});

router.get('/data/city_drive', async (req, res) => {
  console.log('GET /data/city_drive.json'.green);
  fs.readFile('./data/city_drive.json', 'utf8', function (_err, data) {
    res.send(data);
  });
});

export default router;
