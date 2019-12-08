import { Op } from 'sequelize';

import { findOrCreate as findOrCreateCompany } from './Org';
import DeviceModel from '../database/DeviceModel';
import LocationModel from '../database/LocationModel';
import {
  checkCompany,
} from '../libs/utils';

export const getDevice = async ({ id }) => {
  const where = { id };
  const result = await DeviceModel.findOne({
    where,
    attributes: ['id', 'device_id', 'device_model', 'company_id', 'company_token'],
    raw: true,
  });
  return result;
}

export const getDevices = async (where) => {
  const result = await DeviceModel.findAll({
    where,
    attributes: ['id', 'device_id', 'device_model', 'company_id', 'company_token', 'framework'],
    order: [['updated_at', 'DESC NULLS LAST'], ['created_at', 'DESC NULLS LAST']],
    raw: true,
  });
  return result;
}

export const deleteDevice = async ({
  id: deviceId,
  start_date: startDate,
  end_date: endDate,
}) => {
  const whereByDevice = {
    device_id: deviceId,
  };
  const where = { ...whereByDevice };
  if (startDate && endDate && new Date(startDate) && new Date(endDate)) {
    where.recorded_at = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  }
  const result = await LocationModel.destroy({ where });
  const locationsCount = await LocationModel.count({ where: whereByDevice });
  if (!locationsCount) {
    await DeviceModel.destroy({
      where: {
        id: deviceId,
      },
      cascade: true,
    });
  }
  return result;
}

export const findOrCreate = async (
  org = 'UNKNOWN', {
    model,
    uuid,
    framework,
    version,
  }
) => {
  const device = {
    device_id: uuid || 'UNKNOWN',
    model: model || 'UNKNOWN',
  };
  const now = new Date();

  checkCompany({ org, model: device.model });

  const company = await findOrCreateCompany({ company_token: org });
  const where = { company_id: company.id };

  uuid && (where.device_id = uuid);

  const [row] = await DeviceModel.findOrCreate({
    where,
    defaults: {
      company_id: company.id,
      company_token: org,
      device_id: device.device_id,
      device_model: device.model,
      created_at: now,
      framework,
      version,
    },
    raw: true,
  });

  return row;
};
