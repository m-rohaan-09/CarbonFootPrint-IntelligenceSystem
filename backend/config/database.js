const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'cfis.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

module.exports = sequelize;
