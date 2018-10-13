
import winston = require("winston");
import BluebirdPromise = require("bluebird");
import U2F = require("u2f");
import Nodemailer = require("nodemailer");

import { IRequestLogger } from "./logging/IRequestLogger";
import { RequestLogger } from "./logging/RequestLogger";

import { TotpHandler } from "./authentication/totp/TotpHandler";
import { ITotpHandler } from "./authentication/totp/ITotpHandler";
import { NotifierFactory } from "./notifiers/NotifierFactory";
import { MailSenderBuilder } from "./notifiers/MailSenderBuilder";
import { LdapUsersDatabase } from "./authentication/backends/ldap/LdapUsersDatabase";
import { ConnectorFactory } from "./authentication/backends/ldap/connector/ConnectorFactory";

import { IUserDataStore } from "./storage/IUserDataStore";
import { UserDataStore } from "./storage/UserDataStore";
import { INotifier } from "./notifiers/INotifier";
import { Regulator } from "./regulation/Regulator";
import { IRegulator } from "./regulation/IRegulator";
import Configuration = require("./configuration/schema/Configuration");
import { AccessController } from "./access_control/AccessController";
import { IAccessController } from "./access_control/IAccessController";
import { CollectionFactoryFactory } from "./storage/CollectionFactoryFactory";
import { ICollectionFactory } from "./storage/ICollectionFactory";
import { MongoCollectionFactory } from "./storage/mongo/MongoCollectionFactory";
import { IMongoClient } from "./connectors/mongo/IMongoClient";

import { GlobalDependencies } from "../../types/Dependencies";
import { ServerVariables } from "./ServerVariables";
import { MongoClient } from "./connectors/mongo/MongoClient";
import { IGlobalLogger } from "./logging/IGlobalLogger";
import { SessionFactory } from "./authentication/backends/ldap/SessionFactory";
import { IUsersDatabase } from "./authentication/backends/IUsersDatabase";
import { FileUsersDatabase } from "./authentication/backends/file/FileUsersDatabase";
import { WhitelistHandler } from "./authentication/network_whitelist/WhitelistHandler";

class UserDataStoreFactory {
  static create(config: Configuration.Configuration, globalLogger: IGlobalLogger): BluebirdPromise<UserDataStore> {
    if (config.storage.local) {
      const nedbOptions: Nedb.DataStoreOptions = {
        filename: config.storage.local.path,
        inMemoryOnly: config.storage.local.in_memory
      };
      const collectionFactory = CollectionFactoryFactory.createNedb(nedbOptions);
      return BluebirdPromise.resolve(new UserDataStore(collectionFactory));
    }
    else if (config.storage.mongo) {
      const mongoClient = new MongoClient(
        config.storage.mongo,
        globalLogger);
      const collectionFactory = CollectionFactoryFactory.createMongo(mongoClient);
      return BluebirdPromise.resolve(new UserDataStore(collectionFactory));
    }

    return BluebirdPromise.reject(new Error("Storage backend incorrectly configured."));
  }
}

export class ServerVariablesInitializer {
  static createUsersDatabase(
    config: Configuration.Configuration,
    deps: GlobalDependencies)
    : IUsersDatabase {

    if (config.authentication_backend.ldap) {
      const ldapConfig = config.authentication_backend.ldap;
      return new LdapUsersDatabase(
        new SessionFactory(
          ldapConfig,
          new ConnectorFactory(ldapConfig, deps.ldapjs),
          deps.winston
        ),
        ldapConfig
      );
    }
    else if (config.authentication_backend.file) {
      return new FileUsersDatabase(config.authentication_backend.file);
    }
  }

  static initialize(
    config: Configuration.Configuration,
    globalLogger: IGlobalLogger,
    requestLogger: IRequestLogger,
    deps: GlobalDependencies)
    : BluebirdPromise<ServerVariables> {

    const mailSenderBuilder =
      new MailSenderBuilder(Nodemailer);
    const notifier = NotifierFactory.build(
      config.notifier, mailSenderBuilder);
    const accessController = new AccessController(
      config.access_control, deps.winston);
    const totpHandler = new TotpHandler(
      deps.speakeasy);
    const usersDatabase = this.createUsersDatabase(
      config, deps);
    const whitelistHandler = new WhitelistHandler(config.network_binding);

    return UserDataStoreFactory.create(config, globalLogger)
      .then(function (userDataStore: UserDataStore) {
        const regulator = new Regulator(userDataStore, config.regulation.max_retries,
          config.regulation.find_time, config.regulation.ban_time);

        const variables: ServerVariables = {
          accessController,
          config,
          usersDatabase,
          logger: requestLogger,
          notifier,
          regulator,
          totpHandler,
          u2f: deps.u2f,
          userDataStore,
          whitelistHandler,
        };
        return BluebirdPromise.resolve(variables);
      });
  }
}
