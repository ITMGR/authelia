

import express = require("express");
import U2f = require("u2f");
import BluebirdPromise = require("bluebird");
import { AuthenticationSession } from "../../types/AuthenticationSession";
import { IRequestLogger } from "./logging/IRequestLogger";
import { Level } from "./authentication/Level";

const INITIAL_AUTHENTICATION_SESSION: AuthenticationSession = {
  authentication_level: Level.NOT_AUTHENTICATED,
  recognized_by_ip: false,
  last_activity_datetime: undefined,
  userid: undefined,
  email: undefined,
  groups: [],
  register_request: undefined,
  sign_request: undefined,
  identity_check: undefined,
  redirect: undefined
};

export class AuthenticationSessionHandler {
  static reset(req: express.Request, logger: IRequestLogger): void {
    const msg = "Session has been reset...";
    logger.debug(req, msg);
    req.session.auth = Object.assign({}, INITIAL_AUTHENTICATION_SESSION, {});

    // Initialize last activity with current time
    req.session.auth.last_activity_datetime = new Date().getTime();
  }

  static get(req: express.Request, logger: IRequestLogger): AuthenticationSession {
    if (!req.session) {
      const errorMsg = "Something is wrong with session cookies. Please check Redis is running and Authelia can connect to it.";
      logger.error(req, errorMsg);
      throw new Error(errorMsg);
    }

    if (!req.session.auth) {
      AuthenticationSessionHandler.reset(req, logger);
    }

    return req.session.auth;
  }
}