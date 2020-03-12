/* eslint-disable no-console */
import fs from 'fs';
import { Router } from 'express';

import { sign, verify } from '../libs/jwt';
import { decrypt, isEncryptedRequest } from '../libs/RNCrypto';
import {
  AccessDeniedError,
  checkAuth,
  getAuth,
  isAdmin,
  isAdminToken,
  isDDosCompany,
  isPassword,
  return1Gbfile,
} from '../libs/utils';
import { deleteDevice, getDevices } from '../models/Device';
import {
  create,
  deleteLocations,
  getLatestLocation,
  getLocations,
  getStats,
} from '../models/Location';
import { getOrgs, findOne } from '../models/Org';

const router = new Router();

/**
 * GET /company_tokens
 */
router.get('/company_tokens', checkAuth(verify), async (req, res) => {
  try {
    const { org } = req.jwt;
    const orgs = await getOrgs({ org }, isAdmin(req.jwt));
    res.send(orgs);
  } catch (err) {
    console.error('v1', '/company_tokens', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * GET /devices
 */
router.get('/devices', checkAuth(verify), async (req, res) => {
  const {
    companyId: orgId,
    org,
  } = req.jwt;
  const { company_id: companyId } = req.query;
  const admin = isAdmin(req.jwt);
  try {
    const devices = await getDevices(
      {
        companyId: admin ? companyId : orgId,
        org,
      },
      isAdmin(req.jwt),
    );
    res.send(devices);
  } catch (err) {
    console.error('v1', '/devices', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.delete('/devices/:id', checkAuth(verify), async (req, res) => {
  const {
    companyId,
    org,
  } = req.jwt;
  const admin = isAdmin(req.jwt);
  try {
    console.log(
      `DELETE /devices/${req.params.id}?${JSON.stringify(req.query)}\n`.green,
    );
    await deleteDevice(
      {
        ...req.query,
        id: req.params.id,
        org,
        companyId: !admin && companyId,
      },
      isAdmin(req.jwt),
    );
    res.send({ success: true });
  } catch (err) {
    console.error(
      'v1',
      '/devices',
      JSON.stringify(req.params),
      JSON.stringify(req.query),
      err,
    );
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/stats', checkAuth(verify), async (req, res) => {
  try {
    const stats = await getStats();
    res.send(stats);
  } catch (err) {
    console.info('/stats', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/locations/latest', checkAuth(verify), async (req, res) => {
  const { org, companyId: orgId } = req.jwt;
  const { company_id: companyId } = req.query;
  const admin = isAdmin(req.jwt);
  console.log('v1: GET /locations/latest %s'.green, org, companyId, JSON.stringify(req.query));
  try {
    const latest = await getLatestLocation(
      {
        ...req.query,
        org,
        company_id: admin ? companyId : orgId,
      },
      admin,
    );
    res.send(latest);
  } catch (err) {
    console.info('v1: /locations/latest', JSON.stringify(req.query), err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * GET /locations
 */
router.get('/locations', checkAuth(verify), async (req, res) => {
  const { org, companyId: orgId } = req.jwt;
  const { company_id: companyId } = req.query;
  const admin = isAdmin(req.jwt);
  console.log('v1: GET /locations %s'.green, JSON.stringify(req.query));

  try {
    const locations = await getLocations(
      {
        ...req.query,
        org,
        company_id: admin ? companyId : orgId,
      },
      admin,
    );
    res.send(locations);
  } catch (err) {
    console.info('v1: get /locations', JSON.stringify(req.query), err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * POST /locations
 */
router.post('/locations', getAuth(verify), async (req, res) => {
  const { body } = req;
  const data = isEncryptedRequest(req)
    ? decrypt(body.toString())
    : body;
  const { company_token: org } = data;

  if (isDDosCompany(org)) {
    return return1Gbfile(res);
  }

  try {
    await create(data, org);
    return res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error('v1', 'post /locations', err);
    return res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * POST /locations
 */
router.post('/locations/:company_token', getAuth(verify), async (req, res) => {
  const { company_token: org } = req.params;

  console.info('v1:locations:post'.green, 'org:name'.green, org);

  if (isDDosCompany(org)) {
    return return1Gbfile(res);
  }

  const data = isEncryptedRequest(req)
    ? decrypt(req.body.toString())
    : req.body;

  try {
    await create(data, org);

    return res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error('v1', 'post /locations', org, err);
    return res.status(500).send({ error: 'Something failed!' });
  }
});

router.delete('/locations', checkAuth(verify), async (req, res) => {
  const { org, companyId: orgId } = req.jwt;
  const { company_id: companyId } = req.query;
  const admin = isAdmin(req.jwt);
  console.info('v1:locations:delete:query'.green, JSON.stringify(req.query));

  try {
    await deleteLocations(
      {
        ...req.query,
        companyId: admin ? companyId : orgId,
        org,
      },
      admin,
    );

    res.send({ success: true });
  } catch (err) {
    console.info('v1', 'delete /locations', JSON.stringify(req.query), err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.post('/locations_template', async (req, res) => {
  console.log('v1:POST /locations_template\n%s\n'.green, JSON.stringify(req.body));

  res.set('Retry-After', 5);
  res.send({ success: true });
});

router.post('/configure', async (req, res) => {
  const response = {
    access_token: 'e7ebae5e-4bea-4d63-8f28-8a104acd2f4c',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: '2a69e1cd-d7db-44f6-87fc-3d66c4505ee4',
    scope: 'openid+email+profile+phone+address+group',
  };
  res.send(response);
});

router.post('/auth', async (req, res) => {
  const { login, password } = req.body || {};

  try {
    if (isAdminToken(login) && isPassword(password)) {
      const jwtInfo = { org: login, admin: true };

      const accessToken = sign(jwtInfo);
      return res.send({
        access_token: accessToken,
        token_type: 'Bearer',
        org: login,
      });
    }
  } catch (e) {
    console.error('v1', '/auth', e);
  }

  return res.status(401)
    .send({ org: login, error: 'Await not public account and right password' });
});

router.post('/jwt', async (req, res) => {
  const { org } = req.body || {};

  try {
    const { id } = await findOne({ org }) || {};

    if (!id) {
      return res.status(401).send({ org, error: 'Org not found' });
    }

    const jwtInfo = {
      companyId: id,
      org,
    };
    const accessToken = sign(jwtInfo);
    return res.send({
      access_token: accessToken,
      token_type: 'Bearer',
      org,
    });
  } catch (e) {
    console.error('v1', '/jwt', e);
  }

  return res.status(401).send({ org, error: 'Await not public account and right password' });
});

/**
 * Fetch iOS simulator city_drive route
 */
router.get('/data/city_drive', async (req, res) => {
  console.log('v1: GET /data/city_drive.json'.green);
  fs.readFile('./data/city_drive.json', 'utf8', (_err, data) => {
    res.send(data);
  });
});

export default router;
