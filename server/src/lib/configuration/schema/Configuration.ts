import { ACLConfiguration, complete as AclConfigurationComplete } from "./AclConfiguration";
import { AuthenticationBackendConfiguration, complete as AuthenticationBackendComplete } from "./AuthenticationBackendConfiguration";
import { NotifierConfiguration, complete as NotifierConfigurationComplete } from "./NotifierConfiguration";
import { RegulationConfiguration, complete as RegulationConfigurationComplete } from "./RegulationConfiguration";
import { SessionConfiguration, complete as SessionConfigurationComplete } from "./SessionConfiguration";
import { StorageConfiguration, complete as StorageConfigurationComplete } from "./StorageConfiguration";
import { TotpConfiguration, complete as TotpConfigurationComplete } from "./TotpConfiguration";

export interface Configuration {
  access_control?: ACLConfiguration;
  authentication_backend: AuthenticationBackendConfiguration;
  default_redirection_url?: string;
  logs_level?: string;
  notifier?: NotifierConfiguration;
  port?: number;
  regulation?: RegulationConfiguration;
  session?: SessionConfiguration;
  storage?: StorageConfiguration;
  totp?: TotpConfiguration;
}

export function complete(
  configuration: Configuration):
  [Configuration, string[]] {

  const newConfiguration: Configuration = JSON.parse(
    JSON.stringify(configuration));
  const errors: string[] = [];

  newConfiguration.access_control =
    AclConfigurationComplete(
      newConfiguration.access_control);

  const [backend, error] =
    AuthenticationBackendComplete(
      newConfiguration.authentication_backend);

  if (error) errors.push(error);
  newConfiguration.authentication_backend = backend;

  if (!newConfiguration.logs_level) {
    newConfiguration.logs_level = "info";
  }

  const [notifier, notifierError] = NotifierConfigurationComplete(
    newConfiguration.notifier);
  newConfiguration.notifier = notifier;
  if (notifierError) errors.push(notifierError);

  if (!newConfiguration.port) {
    newConfiguration.port = 8080;
  }

  newConfiguration.regulation = RegulationConfigurationComplete(
    newConfiguration.regulation);
  newConfiguration.session = SessionConfigurationComplete(
    newConfiguration.session);
  newConfiguration.storage = StorageConfigurationComplete(
    newConfiguration.storage);
  newConfiguration.totp = TotpConfigurationComplete(
    newConfiguration.totp);

  return [newConfiguration, errors];
}