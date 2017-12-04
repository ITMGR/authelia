import BluebirdPromise = require("bluebird");
import Express = require("express");
import Exceptions = require("../../Exceptions");
import ErrorReplies = require("../../ErrorReplies");
import { ServerVariables } from "../../ServerVariables";
import GetWithSessionCookieMethod from "./get_session_cookie";
import GetWithBasicAuthMethod from "./get_basic_auth";

import { AuthenticationSessionHandler }
  from "../../AuthenticationSessionHandler";
import { AuthenticationSession }
  from "../../../../types/AuthenticationSession";

const REMOTE_USER = "Remote-User";
const REMOTE_GROUPS = "Remote-Groups";


function verifyWithSelectedMethod(req: Express.Request, res: Express.Response,
  vars: ServerVariables, authSession: AuthenticationSession)
  : () => BluebirdPromise<{ username: string, groups: string[] }> {
  return function () {
    const authorization: string = "" + req.headers["proxy-authorization"];
    if (authorization && authorization.startsWith("Basic "))
      return GetWithBasicAuthMethod(req, res, vars, authorization);

    return GetWithSessionCookieMethod(req, res, vars, authSession);
  };
}

function setRedirectHeader(req: Express.Request, res: Express.Response) {
  return function () {
    res.set("Redirect", encodeURIComponent("https://" + req.headers["host"] +
      req.headers["x-original-uri"]));
    return BluebirdPromise.resolve();
  };
}

function setUserAndGroupsHeaders(res: Express.Response) {
  return function (u: { username: string, groups: string[] }) {
    res.setHeader(REMOTE_USER, u.username);
    res.setHeader(REMOTE_GROUPS, u.groups.join(","));
    return BluebirdPromise.resolve();
  };
}

function replyWith200(res: Express.Response) {
  return function () {
    res.status(204);
    res.send();
  };
}

export default function (vars: ServerVariables) {
  return function (req: Express.Request, res: Express.Response)
    : BluebirdPromise<void> {
    let authSession: AuthenticationSession;
    return new BluebirdPromise(function (resolve, reject) {
      authSession = AuthenticationSessionHandler.get(req, vars.logger);
      resolve();
    })
      .then(setRedirectHeader(req, res))
      .then(verifyWithSelectedMethod(req, res, vars, authSession))
      .then(setUserAndGroupsHeaders(res))
      .then(replyWith200(res))
      // The user is authenticated but has restricted access -> 403
      .catch(Exceptions.DomainAccessDenied, ErrorReplies
        .replyWithError403(req, res, vars.logger))
      // The user is not yet authenticated -> 401
      .catch(function(err) {
        res.redirect("https://login.example.com:8080");
      });
  };
}

