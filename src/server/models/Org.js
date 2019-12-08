import CompanyModel from '../database/CompanyModel';

export const getOrgs = async (where) => {
  const result = await CompanyModel.findAll({
    where,
    attributes: ['id', 'company_token'],
    order: [['updated_at', 'DESC NULLS LAST']],
    raw: true,

  });
  return result;
};

export const findOrCreate = async ({ company_token: org }) => {
  const now = new Date();
  const [company] = await CompanyModel.findOrCreate({
    where: { company_token: org },
    defaults: { created_at: now, company_token: org, updated_at: now },
    raw: true,
  });
  return company;
};
