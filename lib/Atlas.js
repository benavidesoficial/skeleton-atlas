const mongoose = require('mongoose');
const Mockgoose = require('mockgoose').Mockgoose;
const Schema = mongoose.Schema;
const glob = require("glob");
const pkgDir = require('pkg-dir');
const RouteProyect = pkgDir.sync();

// Define methods private
const _compileResources = Symbol('compileResources');
const _connectTesting = Symbol('connectTesting');
const _constructResourcesTesting = Symbol('constructResourcesTesting');

class Atlas {

  constructor() {

    this.config = {};
    this._resourcesNameLoad = [];
    this._isTesting = false;
    this._resources = {};
  }

  bootstrap() {
    this._isTesting = isTesting(this.config);
    if (!this._isTesting) {
      connect(this.config);
      constructResources(this.config)
    } else {
      this._bootstrapTesting();
    };
  }

  invokeResources(resource) {
    this._resourcesNameLoad = resource
  }

  _bootstrapTesting() {
    this[_connectTesting]();
    this[_constructResourcesTesting]();
    // connectTesting(this.config);
    // constructResourcesTesting(this.config, this._resourcesNameLoad)
  }

  getResource(resourceName) {
    return this._resources[resourceName];
  }

  // Define models
  [_compileResources]() {
    // const compileModel = (name, schema) => {
    global[name] = mongoose.model(name, schema);
    this._resources[name] = mongoose.model(name, schema);
    // }
  }

  [_connectTesting]() {

    const mockgoose = new Mockgoose(mongoose);

    mockgoose.prepareStorage().then(() => {
      mongoose.connect(this.config.mongodb, {
        useNewUrlParser: true
      });

      mongoose.connection.on('connected', () => {
        console.log('Connection to the database for successful testing !!');
      });

    });
  }

  [_constructResourcesTesting]() {
    // Resources location
    const resources = glob.sync(`${RouteProyect}${this.config.resources}`, {
      realpath: true,
    });

    resources.forEach(__resources_route__ => {

      // Import Resource
      let ClassSchema = require(`${__resources_route__}`);

      // Instance Resources Imported
      let InstanResource = new ClassSchema();

      /**
       * If the resource exists, then we start mapping it for Atlas.
       * Otherwise, the ClassSchema and InstanResource variables will be NULL for
       *  the Garbage Collector to process them.
       */

      // Name of the Resource
      const resourceName = InstanResource.__proto__.constructor.name;

      if (verificationResource(resourceName, this.resourcesNameLoad)) {

        // Creating Schema for Mongoose
        const SCHEMA = new Schema(InstanResource);

        /**
         * Verifying if the resource has public methods.
         * If it exists, then we compile it for Mongoose
         */

        // Obtaining methods public of the Resource
        let publicMethods = getPublicMethod(InstanResource)

        if (publicMethods.length)
          publicMethods.forEach(__method__ => SCHEMA.methods[__method__] = InstanResource[__method__]);

        /**
         * Verifying if the resource has statics methods.
         * If it exists, then we compile it for Mongoose
         */

        // Obtaining methods static of the Resource
        let staticMethods = getStaticsMethod(InstanResource);

        if (staticMethods.length)
          staticMethods.forEach(__method__ => SCHEMA.statics[__method__] = ClassSchema[__method__]);

        // We compile the Schemas to be models of Mongoose.
        compileModel(resourceName, SCHEMA); // Compilado Modelo

      } else {
        ClassSchema = null;
        InstanResource = null;
        resourceName = null;
      }

    });

  }

  // TestingBootstrap(Models) {
  //   connect(this.config);
  //   constructModels(this.config);
  // }

}

const connect = (config) => {
  mongoose.connect(config.mongodb, {
    useNewUrlParser: true
  });
}

// const connectTesting = (config) => {
//
//   const mockgoose = new Mockgoose(mongoose);
//
//   mockgoose.prepareStorage().then(() => {
//     mongoose.connect(config.mongodb, {
//       useNewUrlParser: true
//     });
//
//     mongoose.connection.on('connected', () => {
//       console.log('Connection to the database for successful testing !!');
//     });
//
//   });
// }

const constructResources = (config) => {
  // Resources location
  const resources = glob.sync(`${RouteProyect}${config.resources}`, {
    realpath: true,
  });

  resources.forEach(__model_route__ => {
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

const constructResourcesTesting = (config, resourcesNameLoad) => {

  // Resources location
  const resources = glob.sync(`${RouteProyect}${config.resources}`, {
    realpath: true,
  });

  resources.forEach(__resources_route__ => {

    // Import Resource
    let ClassSchema = require(`${__resources_route__}`);

    // Instance Resources Imported
    let InstanResource = new ClassSchema();

    /**
     * If the resource exists, then we start mapping it for Atlas.
     * Otherwise, the ClassSchema and InstanResource variables will be NULL for
     *  the Garbage Collector to process them.
     */

    // Name of the Resource
    const resourceName = InstanResource.__proto__.constructor.name;

    if (verificationResource(resourceName, resourcesNameLoad)) {

      // Creating Schema for Mongoose
      const SCHEMA = new Schema(InstanResource);

      /**
       * Verifying if the resource has public methods.
       * If it exists, then we compile it for Mongoose
       */

      // Obtaining methods public of the Resource
      let publicMethods = getPublicMethod(InstanResource)

      if (publicMethods.length)
        publicMethods.forEach(__method__ => SCHEMA.methods[__method__] = InstanResource[__method__]);

      /**
       * Verifying if the resource has statics methods.
       * If it exists, then we compile it for Mongoose
       */

      // Obtaining methods static of the Resource
      let staticMethods = getStaticsMethod(InstanResource);

      if (staticMethods.length)
        staticMethods.forEach(__method__ => SCHEMA.statics[__method__] = ClassSchema[__method__]);

      // We compile the Schemas to be models of Mongoose.
      compileModel(resourceName, SCHEMA); // Compilado Modelo

    } else {
      ClassSchema = null;
      InstanResource = null;
      resourceName = null;
    }

  });

}

// Verification Resource to Invoke
const verificationResource = (resourceName, resourceInvokeName) => {
  return resourceInvokeName.includes(resourceName)
}

// Define models
// const compileModel = (name, schema) => {
//   global[name] = mongoose.model(name, schema);
//   this._resources[name] = mongoose.model(name, schema);
// }

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

/**
 * Check if atlas will work in Testing or Production mode.
 * @method isTesting
 * @param  {[type]}  config [Configuration when calling bootstrap method.]
 * @return {Boolean}        [isTesting]
 */

const isTesting = (config) => {
  if (config.hasOwnProperty('atlasEnvironment')) {
    switch (config.atlasEnvironment) {
      case 'production':
        return false
      case 'testing':
        return true
    }
  } else {
    return false
  }
}

module.exports = Atlas;