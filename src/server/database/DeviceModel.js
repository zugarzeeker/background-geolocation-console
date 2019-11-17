import Sequelize from 'sequelize';
import Promise from 'bluebird';
import definedSequelizeDb from './define-sequelize-db';
import LocationModel from './LocationModel';

const DeviceModel = definedSequelizeDb.define(
  'devices',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    company_id: { type: Sequelize.INTEGER },
    // , references: { model: 'companies' }
    company_token: { type: Sequelize.TEXT },
    device_id: { type: Sequelize.TEXT },
    device_model: { type: Sequelize.TEXT },
    created_at: { type: Sequelize.DATE },
    framework: { type: Sequelize.TEXT },
    version: { type: Sequelize.TEXT },
    updated_at: { type: Sequelize.DATE },
  },
  {
    timestamps: false,
    indexes: [
      { fields: ['device_id'] },
      { fields: ['company_id'] },
      { fields: ['company_token'] },
    ],
  }
);

export default DeviceModel;
