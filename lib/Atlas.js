import mongoose from 'mongoose';
import { Mockgoose } from 'mockgoose';
import uniqueValidator from 'mongoose-unique-validator';
import glob from 'glob'
import root from 'app-root-path';
const { Schema } = mongoose;

import {createRequire} from 'module';
const require = createRequire(import.meta.url);

// Define methods private
const _compileResources = Symbol('compileResources');
const _connectTesting = Symbol('connectTesting');
const _connect = Symbol('connect');
const _constructResources = Symbol('constructResources');
const _bootstrapTesting = Symbol('bootstrapTesting');
const _isTesting = Symbol('isTesting');

export default class Atlas {

  constructor() {
    this.skeleton = require(`${root}/skeleton.json`);
    this._storageResourcesToInvoke = [];
    // this._isTesting = false;
    this._resources = {};
  }

  bootstrap() {
    return new Promise(async (resolve, reject) => {
      if (!this[_isTesting]()) {
        await this[_connect]();
        this[_constructResources]()
      } else {
        await this[_bootstrapTesting]();
      }
      resolve();
    });
  }

  invokeResources(resource) {
    this._storageResourcesToInvoke = resource
  }

  getResource(resourceName) {
    return this._resources[resourceName];
  }

  close() {
    mongoose.connection.close()
  }

  [_bootstrapTesting]() {
    return new Promise(async (resolve, reject) => {
      await this[_connectTesting]();
      this[_constructResources]();
      resolve()

    });
  }

  // Define models
  [_compileResources](name, schema) {
    this._resources[name] = mongoose.model(name, schema);
  }


  [_connect]() {
    return new Promise((resolve, reject) => {
      mongoose.connect(this.skeleton.mongodb.url, this.skeleton.mongodb.options, (err) => {
        if (err) throw err;
        console.log('\nConnection to the database for successful production !!\n');
        resolve();
      });
    });

  }

  [_connectTesting]() {
    return new Promise(async (resolve, reject) => {
      const mockgoose = new Mockgoose(mongoose);
      await mockgoose.prepareStorage();
      await mongoose.connect(this.skeleton.mongodb.url, this.skeleton.mongodb.options, (err) => {
        if (err) throw err;
        console.log('\nConnection to the database for successful testing !!\n');
        resolve();
      });
    });
  }

  [_constructResources]() {
    // Resources location
    const resources = glob.sync(`${root}${this.skeleton.config.resources}`);

    resources.forEach( async (__resources_route__) => {

      // Import Resource
      const ClassSchema = await import(`${__resources_route__}`);
      console.log(ClassSchema)
      // Instance Resources Imported
      const InstanResource =  new ClassSchema.default();

      /**
       * If the resource exists, then we start mapping it for Atlas.
       * Otherwise, the ClassSchema and InstanResource variables will be NULL for
       *  the Garbage Collector to process them.
       */

          // Name of the Resource
      let resourceName = InstanResource.__proto__.constructor.name;
      if ((verificationResource(resourceName, this._storageResourcesToInvoke) && this[_isTesting]()) || !this[_isTesting]()) {
        // Creating Schema for Mongoose
        const SCHEMA = new Schema(InstanResource);

        // AddPlugins
        SCHEMA.plugin(uniqueValidator);
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

        // Obtaining middleware of the Resources
        let middlewares = getMiddlewares(InstanResource);
        // console.log( ClassSchema[middleware])

        if (middlewares.length)
          middlewares.forEach(middleware => processingMiddleware(middleware, SCHEMA, ClassSchema[middleware]))
        // We compile the Schemas to be models of Mongoose.
        this[_compileResources](resourceName, SCHEMA); // Compilado Modelo

      } else {
        ClassSchema = null;
        InstanResource = null;
        resourceName = null;
      }

    });

  }

  // Define models
  [_isTesting]() {
    if (this.skeleton.config.hasOwnProperty('atlas')) {
      switch (this.skeleton.config.atlas.environment) {
        case 'production':
          return false
        case 'testing':
          return true
      }
    } else {
      return false
    }
  }
}

// Verification Resource to Invoke
const verificationResource = (resourceName, resourceInvokeName) => {
  return resourceInvokeName.includes(resourceName)
}

// Devuelve los metodos Public de una Clase, que se encuentra instanciada
const getPublicMethod = (Class) => {
  return Object.getOwnPropertyNames(Class.__proto__)
      .filter(method => method !== 'constructor');
}

// Return middleware methods
const getMiddlewares = (Class) => {
  let middlewares = [
    'onBeforeValidate',
    'onBeforeInsertMany',
    'onAfterInsertMany',
    'onBeforeCreate',
    'onAfterCreate',
    'onBeforeFindAndUpdate',
    'onBeforeFindOneAndDelete',
    'onBeforeRemove',
    'onAfterUpdateOne',
    'onBeforeUpdateOne',
  ];
  return Object.getOwnPropertyNames(Class.__proto__.constructor)
      .filter(method => middlewares.includes(method));
}

// Devuelve los metodos Statics de una Clase, Es importante que se sencuente instanciada
const getStaticsMethod = (Class) => {
  return Object.getOwnPropertyNames(Class.__proto__.constructor)
      .filter(method => method !== 'prototype')
      .filter(method => method !== 'name')
      .filter(method => method !== 'length');
}

// Processing middleware
const processingMiddleware = (middleware, SCHEMA, method) => {
  switch (middleware) {
    case 'onBeforeValidate':
      SCHEMA.pre('validate', method);
      break;

    case 'onBeforeInsertMany':
      SCHEMA.pre('insertMany', method);
      break;

    case 'onBeforeCreate':
      SCHEMA.pre('save', method);
      break;

    case 'onAfterCreate':
      SCHEMA.post('save', method);
      break;

    case 'onAfterInsertMany':
      SCHEMA.post('insertMany', method);
      break;

    case 'onBeforeFindAndUpdate':
      SCHEMA.pre('findOneAndUpdate', method);
      break;

    case 'onBeforeFindOneAndDelete':
      SCHEMA.pre('findOneAndDelete', method);
      break;

    case 'onBeforeRemove':
      SCHEMA.pre('remove', method);
      break;

      // case 'onAfterUpdateOne':
      //   SCHEMA.post('updateOne', method);
      //   break;

    case 'onBeforeUpdateOne':
      SCHEMA.pre('updateOne', method);
      break;


    default:

  }

}
