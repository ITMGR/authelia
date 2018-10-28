import U2f = require("u2f");
import U2fApi = require("u2f-api-polyfill");
import BluebirdPromise = require("bluebird");
import { SignMessage } from "../../../../shared/SignMessage";
import Endpoints = require("../../../../shared/api");
import UserMessages = require("../../../../shared/UserMessages");
import { INotifier } from "../INotifier";
import { RedirectionMessage } from "../../../../shared/RedirectionMessage";
import { ErrorMessage } from "../../../../shared/ErrorMessage";
import GetPromised from "../GetPromised";

function finishU2fAuthentication(responseData: U2fApi.SignResponse,
  $: JQueryStatic): BluebirdPromise<string> {
  return new BluebirdPromise<string>(function (resolve, reject) {
    $.ajax({
      url: Endpoints.SECOND_FACTOR_U2F_SIGN_POST,
      data: responseData,
      method: "POST",
      dataType: "json"
    } as JQueryAjaxSettings)
      .done(function (body: RedirectionMessage | ErrorMessage) {
        if (body && "error" in body) {
          reject(new Error((body as ErrorMessage).error));
          return;
        }
        resolve((body as RedirectionMessage).redirect);
      })
      .fail(function (xhr: JQueryXHR, textStatus: string) {
        reject(new Error(textStatus));
      });
  });
}

function u2fApiSign(appId: string, challenge: string,
  registeredKey: U2fApi.RegisteredKey, timeout: number)
  : BluebirdPromise<U2fApi.SignResponse> {

  return new BluebirdPromise<U2fApi.SignResponse>(function (resolve, reject) {
    (<any>window).u2f.sign(appId, challenge, [registeredKey],
      function (signResponse: U2fApi.SignResponse | U2fApi.U2FError) {
        if ((<U2fApi.U2FError>signResponse).errorCode != 0) {
          reject(new Error((signResponse as U2fApi.U2FError).errorMessage));
          return;
        }
        resolve(signResponse as U2fApi.SignResponse);
      }, timeout);
  });
}

function startU2fAuthentication($: JQueryStatic)
  : BluebirdPromise<string> {

  return GetPromised($, Endpoints.SECOND_FACTOR_U2F_SIGN_REQUEST_GET, {},
    undefined, "json")
    .then(function (signResponse: SignMessage) {
      const registeredKey: U2fApi.RegisteredKey = {
        keyHandle: signResponse.keyHandle,
        version: "U2F_V2",
        appId: signResponse.request.appId,
        transports: []
      };

      return u2fApiSign(signResponse.request.appId,
        signResponse.request.challenge, registeredKey, 60);
    })
    .then(function (signResponse: U2fApi.SignResponse) {
      return finishU2fAuthentication(signResponse, $);
    });
}


export function validate($: JQueryStatic, notifier: INotifier) {
  return startU2fAuthentication($)
    .catch(function (err: Error) {
      notifier.error(UserMessages.U2F_TRANSACTION_FINISH_FAILED);
      return BluebirdPromise.reject(err);
    });
}
