const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Settings = require('./../../config/settings');
const glob = require("glob");
const pkgDir = require('pkg-dir');
const RouteProyect = pkgDir.sync();

class DataMapper {
  constructor() {
    this.URLModels = String;
    connect();
  }

  bootstrap() {
    constructModels();
  }

  static TestingBootstrap(Models) {
    connect();
    constructModels();
  }
}

const connect = () => {
  mongoose.connect(Settings.mongodb);
}

const constructModels = () => {
  const models = glob.sync(`${RouteProyect}${Settings.URLModels}`, {
    realpath: true,
  }); // Ubicacion de los Modelos
  models.forEach(__model_route__ => {
    const ClassSchema = require(`${__model_route__}`); // Importando Modelo
    const InstanModel = new ClassSchema(); // Instancia del Modelo Importado
    const Model = new Schema(InstanModel); // Creando modelo para Mongoose
    const nameModel = new ClassSchema().__proto__.constructor.name; // Nombre del Modelo
    // Verificar si tiene metodos publicos
    let publicMethods = getPublicMethod(InstanModel) // Obteniendo metodos del objeto
    // Si existen metodos se los cargamos al Model
    if (publicMethods.length)
      publicMethods.forEach(__method__ => Model.methods[__method__] = InstanModel[__method__]) // Al Schema de Mongoose se le Carga el Metodo del modelo
    // Verificar si tiene metodos Statics
    let staticMethods = getStaticsMethod(InstanModel) // Obteniendo metodos Staticos del objeto
    if (staticMethods.length)
      staticMethods.forEach(__method__ => Model.statics[__method__] = ClassSchema[__method__]) // Al Schema de Mongoose se le Carga el Metodo del modelo
    // Hook
    compileModel(nameModel, Model); // Compilado Modelo
  });
}

const testingConstructModels = () => {

}

// Definiendo modelos
const compileModel = (Name, Schema) => {
  global[Name] = mongoose.model(Name, Schema);
}

// Devuelve los metodos Public de una Clase, que se encuentra instanciada
const getPublicMethod = (Class) => {
  return Object.getOwnPropertyNames(Class.__proto__)
    .filter(method => method !== 'constructor');
}

// Devuelve los metodos Statics de una Clase, Es importante que se sencuente instanciada
const getStaticsMethod = (Class) => {
  return Object.getOwnPropertyNames(Class.__proto__.constructor)
    .filter(method => method !== 'prototype')
    .filter(method => method !== 'name')
    .filter(method => method !== 'length');
}

module.exports = DataMapper;