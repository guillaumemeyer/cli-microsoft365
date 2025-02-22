import { Cli } from '../../../../cli/Cli';
import { Logger } from '../../../../cli/Logger';
import Command, {
  CommandError
} from '../../../../Command';
import config from '../../../../config';
import GlobalOptions from '../../../../GlobalOptions';
import request, { CliRequestOptions } from '../../../../request';
import { formatting } from '../../../../utils/formatting';
import { ClientSvcResponse, ClientSvcResponseContents, FormDigestInfo, spo, SpoOperation } from '../../../../utils/spo';
import { urlUtil } from '../../../../utils/urlUtil';
import { validation } from '../../../../utils/validation';
import * as aadO365GroupSetCommand from '../../../aad/commands/o365group/o365group-set';
import { Options as AadO365GroupSetCommandOptions } from '../../../aad/commands/o365group/o365group-set';
import SpoCommand from '../../../base/SpoCommand';
import commands from '../../commands';
import { SharingCapabilities } from '../site/SharingCapabilities';
import * as spoSiteDesignApplyCommand from '../sitedesign/sitedesign-apply';
import { Options as SpoSiteDesignApplyCommandOptions } from '../sitedesign/sitedesign-apply';
import { FlowsPolicy } from './FlowsPolicy';

interface CommandArgs {
  options: Options;
}

export interface Options extends GlobalOptions {
  classification?: string;
  disableFlows?: boolean;
  socialBarOnSitePagesDisabled?: boolean;
  isPublic?: boolean;
  owners?: string;
  shareByEmailEnabled?: boolean;
  siteDesignId?: string;
  title?: string;
  description?: string;
  url: string;
  sharingCapability?: string;
  siteLogoUrl?: string;
  resourceQuota?: string | number;
  resourceQuotaWarningLevel?: string | number;
  storageQuota?: string | number;
  storageQuotaWarningLevel?: string | number;
  allowSelfServiceUpgrade?: boolean;
  lockState?: string;
  noScriptSite?: boolean;
  wait?: boolean;
}

class SpoSiteSetCommand extends SpoCommand {
  private groupId: string | undefined;
  private siteId: string | undefined;
  private spoAdminUrl?: string;
  private context?: FormDigestInfo;
  private tenantId?: string;

  public get name(): string {
    return commands.SITE_SET;
  }

  public get description(): string {
    return 'Updates properties of the specified site';
  }

  constructor() {
    super();

    this.#initTelemetry();
    this.#initOptions();
    this.#initValidators();
    this.#initTypes();
  }

  #initTelemetry(): void {
    this.telemetry.push((args: CommandArgs) => {
      Object.assign(this.telemetryProperties, {
        classification: typeof args.options.classification === 'string',
        disableFlows: args.options.disableFlows,
        socialBarOnSitePagesDisabled: args.options.socialBarOnSitePagesDisabled,
        isPublic: args.options.isPublic,
        owners: typeof args.options.owners !== 'undefined',
        shareByEmailEnabled: args.options.shareByEmailEnabled,
        title: typeof args.options.title === 'string',
        description: typeof args.options.description === 'string',
        siteDesignId: typeof args.options.siteDesignId !== undefined,
        sharingCapabilities: args.options.sharingCapability,
        siteLogoUrl: typeof args.options.siteLogoUrl !== 'undefined',
        resourceQuota: args.options.resourceQuota,
        resourceQuotaWarningLevel: args.options.resourceQuotaWarningLevel,
        storageQuota: args.options.storageQuota,
        storageQuotaWarningLevel: args.options.storageQuotaWarningLevel,
        allowSelfServiceUpgrade: args.options.allowSelfServiceUpgrade,
        lockState: args.options.lockState,
        noScriptSite: args.options.noScriptSite,
        wait: args.options.wait === true
      });
    });
  }

  #initOptions(): void {
    this.options.unshift(
      {
        option: '-u, --url <url>'
      },
      {
        option: '-i, --id [id]'
      },
      {
        option: '--classification [classification]'
      },
      {
        option: '--disableFlows [disableFlows]',
        autocomplete: ['true', 'false']
      },
      {
        option: '--socialBarOnSitePagesDisabled [socialBarOnSitePagesDisabled]',
        autocomplete: ['true', 'false']
      },
      {
        option: '--isPublic [isPublic]',
        autocomplete: ['true', 'false']
      },
      {
        option: '--owners [owners]'
      },
      {
        option: '--shareByEmailEnabled [shareByEmailEnabled]',
        autocomplete: ['true', 'false']
      },
      {
        option: '--siteDesignId [siteDesignId]'
      },
      {
        option: '--title [title]'
      },
      {
        option: '--description [description]'
      },
      {
        option: '--siteLogoUrl [siteLogoUrl]'
      },
      {
        option: '--sharingCapability [sharingCapability]',
        autocomplete: this.sharingCapabilities
      },
      {
        option: '--resourceQuota [resourceQuota]'
      },
      {
        option: '--resourceQuotaWarningLevel [resourceQuotaWarningLevel]'
      },
      {
        option: '--storageQuota [storageQuota]'
      },
      {
        option: '--storageQuotaWarningLevel [storageQuotaWarningLevel]'
      },
      {
        option: '--allowSelfServiceUpgrade [allowSelfServiceUpgrade]',
        autocomplete: ['true', 'false']
      },
      {
        option: '--lockState [lockState]',
        autocomplete: ['Unlock', 'NoAdditions', 'ReadOnly', 'NoAccess']
      },
      {
        option: '--noScriptSite [noScriptSite]',
        autocomplete: ['true', 'false']
      },
      {
        option: '--wait'
      }
    );
  }

  #initValidators(): void {
    this.validators.push(
      async (args: CommandArgs) => {
        const isValidSharePointUrl: boolean | string = validation.isValidSharePointUrl(args.options.url);
        if (isValidSharePointUrl !== true) {
          return isValidSharePointUrl;
        }

        if (typeof args.options.classification === 'undefined' &&
          typeof args.options.disableFlows === 'undefined' &&
          typeof args.options.socialBarOnSitePagesDisabled === 'undefined' &&
          typeof args.options.title === 'undefined' &&
          typeof args.options.description === 'undefined' &&
          typeof args.options.isPublic === 'undefined' &&
          typeof args.options.owners === 'undefined' &&
          typeof args.options.shareByEmailEnabled === 'undefined' &&
          typeof args.options.siteDesignId === 'undefined' &&
          typeof args.options.sharingCapability === 'undefined' &&
          typeof args.options.siteLogoUrl === 'undefined' &&
          typeof args.options.resourceQuota === 'undefined' &&
          typeof args.options.resourceQuotaWarningLevel === 'undefined' &&
          typeof args.options.storageQuota === 'undefined' &&
          typeof args.options.storageQuotaWarningLevel === 'undefined' &&
          typeof args.options.noScriptSite === 'undefined' &&
          typeof args.options.allowSelfServiceUpgrade === 'undefined' &&
          typeof args.options.lockState === 'undefined') {
          return 'Specify at least one property to update';
        }

        if (typeof args.options.siteLogoUrl !== 'undefined' && typeof args.options.siteLogoUrl !== 'string') {
          return `${args.options.siteLogoUrl} is not a valid value for the siteLogoUrl option. Specify the logo URL or an empty string "" to unset the logo.`;
        }

        if (args.options.siteDesignId) {
          if (!validation.isValidGuid(args.options.siteDesignId)) {
            return `${args.options.siteDesignId} is not a valid GUID`;
          }
        }

        if (args.options.sharingCapability &&
          this.sharingCapabilities.indexOf(args.options.sharingCapability) < 0) {
          return `${args.options.sharingCapability} is not a valid value for the sharingCapability option. Allowed values are ${this.sharingCapabilities.join('|')}`;
        }

        if (args.options.resourceQuota &&
          typeof args.options.resourceQuota !== 'number') {
          return `${args.options.resourceQuota} is not a number`;
        }

        if (args.options.resourceQuotaWarningLevel &&
          typeof args.options.resourceQuotaWarningLevel !== 'number') {
          return `${args.options.resourceQuotaWarningLevel} is not a number`;
        }

        if (args.options.resourceQuota &&
          args.options.resourceQuotaWarningLevel &&
          args.options.resourceQuotaWarningLevel > args.options.resourceQuota) {
          return `resourceQuotaWarningLevel must not exceed the resourceQuota`;
        }

        if (args.options.storageQuota &&
          typeof args.options.storageQuota !== 'number') {
          return `${args.options.storageQuota} is not a number`;
        }

        if (args.options.storageQuotaWarningLevel &&
          typeof args.options.storageQuotaWarningLevel !== 'number') {
          return `${args.options.storageQuotaWarningLevel} is not a number`;
        }

        if (args.options.storageQuota &&
          args.options.storageQuotaWarningLevel &&
          args.options.storageQuotaWarningLevel > args.options.storageQuota) {
          return `storageQuotaWarningLevel must not exceed the storageQuota`;
        }

        if (args.options.lockState &&
          ['Unlock', 'NoAdditions', 'ReadOnly', 'NoAccess'].indexOf(args.options.lockState) === -1) {
          return `${args.options.lockState} is not a valid value for the lockState option. Allowed values Unlock|NoAdditions|ReadOnly|NoAccess`;
        }

        return true;
      }
    );
  }

  #initTypes(): void {
    this.types.string.push('classification');
    this.types.boolean.push('isPublic', 'disableFlows', 'socialBarOnSitePagesDisabled', 'shareByEmailEnabled', 'allowSelfServiceUpgrade', 'noScriptSite');
  }

  public async commandAction(logger: Logger, args: CommandArgs): Promise<void> {
    try {
      this.tenantId = await spo.getTenantId(logger, this.debug);
      this.spoAdminUrl = await spo.getSpoAdminUrl(logger, this.debug);
      this.context = await spo.ensureFormDigest(this.spoAdminUrl, logger, this.context, this.debug);

      await this.loadSiteIds(args.options.url, logger);

      if (this.isGroupConnectedSite()) {
        await this.updateGroupConnectedSite(logger, args);
      }
      else {
        await this.updateSharePointOnlySite(logger, args);
      }

      const siteProps = await this.updateSiteProperties(logger, args);
      await this.waitForSiteUpdateCompletion(logger, args, siteProps);
      await this.applySiteDesign(logger, args);
      await this.setLogo(logger, args);
      const lockState = await this.updateSiteLockState(logger, args);
      await this.waitForSiteUpdateCompletion(logger, args, lockState);
    }
    catch (err: any) {
      if (err instanceof CommandError) {
        err = (err as CommandError).message;
      }

      this.handleRejectedPromise(err);
    }
  }

  private setLogo(logger: Logger, args: CommandArgs): Promise<void> {
    if (typeof args.options.siteLogoUrl === 'undefined') {
      return Promise.resolve();
    }

    if (this.debug) {
      logger.logToStderr(`Setting the site its logo...`);
    }

    const logoUrl = args.options.siteLogoUrl ? urlUtil.getServerRelativePath(args.options.url, args.options.siteLogoUrl) : "";

    const requestOptions: any = {
      url: `${args.options.url}/_api/siteiconmanager/setsitelogo`,
      headers: {
        accept: 'application/json;odata=nometadata'
      },
      data: {
        relativeLogoUrl: logoUrl
      },
      responseType: 'json'
    };

    return request.post(requestOptions);
  }

  private updateSharePointOnlySite(logger: Logger, args: CommandArgs): Promise<void> {
    if (this.debug) {
      logger.logToStderr('Site is not group connected');
    }

    if (typeof args.options.isPublic !== 'undefined') {
      return Promise.reject(`The isPublic option can't be set on a site that is not groupified`);
    }

    return this.updateSiteDescription(logger, args)
      .then(_ => this.updateSiteOwners(logger, args));
  }

  private waitForSiteUpdateCompletion(logger: Logger, args: CommandArgs, res?: string): Promise<void> {
    return new Promise<void>((resolve: () => void, reject: (error: any) => void): void => {
      if (!res) {
        resolve();
        return;
      }

      const json: ClientSvcResponse = JSON.parse(res);
      const response: ClientSvcResponseContents = json[0];
      if (response.ErrorInfo) {
        reject(response.ErrorInfo.ErrorMessage);
      }
      else {
        const operation: SpoOperation = json[json.length - 1];
        const isComplete: boolean = operation.IsComplete;
        if (!args.options.wait || isComplete) {
          resolve();
          return;
        }

        setTimeout(() => {
          spo.waitUntilFinished({
            operationId: JSON.stringify(operation._ObjectIdentity_),
            siteUrl: this.spoAdminUrl as string,
            resolve,
            reject,
            logger,
            currentContext: this.context as FormDigestInfo,
            debug: this.debug,
            verbose: this.verbose
          });
        }, operation.PollingInterval);
      }
    });
  }

  private updateSiteOwners(logger: Logger, args: CommandArgs): Promise<void> {
    if (!args.options.owners) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve: () => void, reject: (error: any) => void): void => {
      if (this.verbose) {
        logger.logToStderr(`Updating site owners ${args.options.url}...`);
      }

      Promise.all(args.options.owners!.split(',').map(o => {
        return this.setAdmin(args.options.url, o.trim());
      }))
        .then((): void => {
          resolve();
        }, (err: any): void => {
          reject(err);
        });
    });
  }

  private setAdmin(siteUrl: string, principal: string): Promise<void> {
    return new Promise<void>((resolve: () => void, reject: (error: any) => void) => {
      const requestOptions: any = {
        url: `${this.spoAdminUrl}/_vti_bin/client.svc/ProcessQuery`,
        headers: {
          'X-RequestDigest': this.context!.FormDigestValue
        },
        data: `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="48" ObjectPathId="47" /></Actions><ObjectPaths><Method Id="47" ParentId="34" Name="SetSiteAdmin"><Parameters><Parameter Type="String">${formatting.escapeXml(siteUrl)}</Parameter><Parameter Type="String">${formatting.escapeXml(principal)}</Parameter><Parameter Type="Boolean">true</Parameter></Parameters></Method><Constructor Id="34" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`
      };

      return request.post<string>(requestOptions)
        .then((res: string): void => {
          const json: ClientSvcResponse = JSON.parse(res);
          const response: ClientSvcResponseContents = json[0];
          if (response.ErrorInfo) {
            reject(response.ErrorInfo.ErrorMessage);
          }
          else {
            resolve();
          }
        }, (err: any): void => {
          reject(err);
        });
    });
  }

  private updateSiteDescription(logger: Logger, args: CommandArgs): Promise<void> {
    if (!args.options.description) {
      return Promise.resolve(undefined as any);
    }

    if (this.verbose) {
      logger.logToStderr(`Setting site description ${args.options.url}...`);
    }

    const requestOptions: any = {
      url: `${args.options.url}/_api/web`,
      headers: {
        'IF-MATCH': '*',
        'Accept': 'application/json;odata=nometadata',
        'content-type': 'application/json;odata=nometadata',
        'X-RequestDigest': this.context!.FormDigestValue,
        'X-HTTP-Method': 'MERGE'
      },
      data: {
        Description: args.options.description
      },
      json: true
    };

    return request.post(requestOptions);
  }

  private updateSiteLockState(logger: Logger, args: CommandArgs): Promise<string> {
    if (!args.options.lockState) {
      return Promise.resolve(undefined as any);
    }

    if (this.verbose) {
      logger.logToStderr(`Setting site lock state ${args.options.url}...`);
    }

    const requestOptions: any = {
      url: `${this.spoAdminUrl}/_vti_bin/client.svc/ProcessQuery`,
      headers: {
        'X-RequestDigest': (this.context as FormDigestInfo).FormDigestValue
      },
      data: `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><SetProperty Id="7" ObjectPathId="5" Name="LockState"><Parameter Type="String">${formatting.escapeXml(args.options.lockState)}</Parameter></SetProperty><ObjectPath Id="9" ObjectPathId="8" /><ObjectIdentityQuery Id="10" ObjectPathId="5" /><Query Id="11" ObjectPathId="8"><Query SelectAllProperties="true"><Properties /></Query></Query></Actions><ObjectPaths><Method Id="5" ParentId="3" Name="GetSitePropertiesByUrl"><Parameters><Parameter Type="String">${formatting.escapeXml(args.options.url)}</Parameter><Parameter Type="Boolean">false</Parameter></Parameters></Method><Method Id="8" ParentId="5" Name="Update" /><Constructor Id="3" TypeId="{268004ae-ef6b-4e9b-8425-127220d84719}" /></ObjectPaths></Request>`
    };

    return request.post(requestOptions);
  }

  private updateGroupConnectedSite(logger: Logger, args: CommandArgs): Promise<void> {
    if (this.debug) {
      logger.logToStderr(`Site attached to group ${this.groupId}`);
    }

    return new Promise<void>((resolve: () => void, reject: (error: any) => void): void => {
      if (typeof args.options.title === 'undefined' &&
        typeof args.options.description === 'undefined' &&
        typeof args.options.isPublic === 'undefined' &&
        typeof args.options.owners === 'undefined') {
        return resolve();
      }

      const promises: Promise<void>[] = [];

      if (typeof args.options.title !== 'undefined') {
        const requestOptions: any = {
          url: `${this.spoAdminUrl}/_api/SPOGroup/UpdateGroupPropertiesBySiteId`,
          headers: {
            accept: 'application/json;odata=nometadata',
            'content-type': 'application/json;charset=utf-8',
            'X-RequestDigest': this.context!.FormDigestValue
          },
          data: {
            groupId: this.groupId,
            siteId: this.siteId,
            displayName: args.options.title
          },
          responseType: 'json'
        };

        promises.push(request.post(requestOptions));
      }

      if (typeof args.options.isPublic !== 'undefined') {
        const commandOptions: AadO365GroupSetCommandOptions = {
          id: this.groupId as string,
          isPrivate: (args.options.isPublic === false),
          debug: this.debug,
          verbose: this.verbose
        };
        promises.push(Cli.executeCommand(aadO365GroupSetCommand as Command, { options: { ...commandOptions, _: [] } }));
      }

      if (args.options.description) {
        promises.push(this.setGroupifiedSiteDescription(args.options.description));
      }

      promises.push(this.setGroupifiedSiteOwners(logger, args));

      Promise
        .all(promises)
        .then((): void => {
          resolve();
        }, (error: any): void => {
          reject(error);
        });
    });
  }

  private setGroupifiedSiteDescription(description: string): Promise<void> {
    const requestOptions: any = {
      url: `https://graph.microsoft.com/v1.0/groups/${this.groupId}`,
      headers: {
        'content-type': 'application/json;odata.metadata=none'
      },
      data: {
        description: description
      }
    };

    return request.patch(requestOptions);
  }

  private setGroupifiedSiteOwners(logger: Logger, args: CommandArgs): Promise<void> {
    if (typeof args.options.owners === 'undefined') {
      return Promise.resolve();
    }

    const owners: string[] = args.options.owners.split(',').map(o => o.trim());

    if (this.verbose) {
      logger.logToStderr('Retrieving user information to set group owners...');
    }

    const requestOptions: any = {
      url: `https://graph.microsoft.com/v1.0/users?$filter=${owners.map(o => `userPrincipalName eq '${o}'`).join(' or ')}&$select=id`,
      headers: {
        'content-type': 'application/json;odata.metadata=none'
      },
      responseType: 'json'
    };

    return request.get<{ value: { id: string; }[] }>(requestOptions)
      .then((res: { value: { id: string; }[] }): Promise<any> => {
        if (res.value.length === 0) {
          return Promise.resolve();
        }

        return Promise.all(res.value.map(user => {
          const requestOptions: any = {
            url: `${this.spoAdminUrl}/_api/SP.Directory.DirectorySession/Group('${this.groupId}')/Owners/Add(objectId='${user.id}', principalName='')`,
            headers: {
              'content-type': 'application/json;odata=verbose'
            }
          };

          return request.post(requestOptions);
        }));
      });
  }

  private async updateSiteProperties(logger: Logger, args: CommandArgs): Promise<string | undefined> {
    const isGroupConnectedSite = this.isGroupConnectedSite();
    const sharedProperties: string[] = ['classification', 'disableFlows', 'socialBarOnSitePagesDisabled', 'shareByEmailEnabled', 'sharingCapability', 'noScriptSite'];
    const siteProperties: string[] = ['title', 'resourceQuota', 'resourceQuotaWarningLevel', 'storageQuota', 'storageQuotaWarningLevel', 'allowSelfServiceUpgrade'];
    let properties: string[] = sharedProperties;

    if (!isGroupConnectedSite) {
      properties = properties.concat(siteProperties);
    }

    let updatedProperties: boolean = false;
    for (let i: number = 0; i < properties.length; i++) {
      if (typeof (args.options as any)[properties[i]] !== 'undefined') {
        updatedProperties = true;
        break;
      }
    }

    if (!updatedProperties) {
      return Promise.resolve(undefined as any);
    }

    const res = await spo.ensureFormDigest(this.spoAdminUrl!, logger, this.context, this.debug);
    this.context = res;

    if (this.verbose) {
      logger.logToStderr(`Updating site ${args.options.url} properties...`);
    }

    let propertyId = 27;
    const payload: string[] = [];
    const sitePropertiesPayload: string[] = [];

    if (!isGroupConnectedSite) {
      if (args.options.title) {
        payload.push(`<SetProperty Id="${propertyId++}" ObjectPathId="5" Name="Title"><Parameter Type="String">${formatting.escapeXml(args.options.title)}</Parameter></SetProperty>`);
      }
      if (args.options.resourceQuota) {
        payload.push(`<SetProperty Id="${propertyId++}" ObjectPathId="5" Name="UserCodeMaximumLevel"><Parameter Type="Double">${args.options.resourceQuota}</Parameter></SetProperty>`);
      }
      if (args.options.resourceQuotaWarningLevel) {
        payload.push(`<SetProperty Id="${propertyId++}" ObjectPathId="5" Name="UserCodeWarningLevel"><Parameter Type="Double">${args.options.resourceQuotaWarningLevel}</Parameter></SetProperty>`);
      }
      if (args.options.storageQuota) {
        payload.push(`<SetProperty Id="${propertyId++}" ObjectPathId="5" Name="StorageMaximumLevel"><Parameter Type="Int64">${args.options.storageQuota}</Parameter></SetProperty>`);
      }
      if (args.options.storageQuotaWarningLevel) {
        payload.push(`<SetProperty Id="${propertyId++}" ObjectPathId="5" Name="StorageWarningLevel"><Parameter Type="Int64">${args.options.storageQuotaWarningLevel}</Parameter></SetProperty>`);
      }
      if (args.options.allowSelfServiceUpgrade !== undefined) {
        payload.push(`<SetProperty Id="${propertyId++}" ObjectPathId="5" Name="AllowSelfServiceUpgrade"><Parameter Type="Boolean">${args.options.allowSelfServiceUpgrade}</Parameter></SetProperty>`);
      }
    }
    if (typeof args.options.classification === 'string') {
      sitePropertiesPayload.push(`<SetProperty Id="${propertyId++}" ObjectPathId="5" Name="Classification"><Parameter Type="String">${formatting.escapeXml(args.options.classification)}</Parameter></SetProperty>`);
    }
    if (args.options.disableFlows !== undefined) {
      const flowsPolicy: FlowsPolicy = args.options.disableFlows ? FlowsPolicy.Disabled : FlowsPolicy.Enabled;
      payload.push(`<SetProperty Id="${propertyId++}" ObjectPathId="5" Name="DisableFlows"><Parameter Type="Enum">${flowsPolicy}</Parameter></SetProperty>`);
    }
    if (args.options.shareByEmailEnabled !== undefined) {
      sitePropertiesPayload.push(`<SetProperty Id="${propertyId++}" ObjectPathId="5" Name="ShareByEmailEnabled"><Parameter Type="Boolean">${args.options.shareByEmailEnabled}</Parameter></SetProperty>`);
    }
    if (args.options.sharingCapability) {
      const sharingCapability: SharingCapabilities = SharingCapabilities[(args.options.sharingCapability as keyof typeof SharingCapabilities)];
      payload.push(`<SetProperty Id="${propertyId++}" ObjectPathId="5" Name="SharingCapability"><Parameter Type="Enum">${sharingCapability}</Parameter></SetProperty>`);
    }
    if (args.options.noScriptSite !== undefined) {
      const noScriptSite: number = args.options.noScriptSite ? 2 : 1;
      payload.push(`<SetProperty Id="${propertyId++}" ObjectPathId="5" Name="DenyAddAndCustomizePages"><Parameter Type="Enum">${noScriptSite}</Parameter></SetProperty>`);
    }

    let response;
    let sitePropertiesResponse;

    if (sitePropertiesPayload.length > 0) {
      const requestOptions: CliRequestOptions = {
        url: `${args.options.url}/_vti_bin/client.svc/ProcessQuery`,
        headers: {
          'X-RequestDigest': res.FormDigestValue
        },
        data: `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions>${sitePropertiesPayload.join('')}</Actions><ObjectPaths><StaticProperty Id="1" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /><Property Id="5" ParentId="1" Name="Site" /></ObjectPaths></Request>`
      };

      sitePropertiesResponse = await request.post<string>(requestOptions);
    }

    if (payload.length > 0) {
      const pos = (this.tenantId as string).indexOf('|') + 1;

      const requestOptions: CliRequestOptions = {
        url: `${this.spoAdminUrl}/_vti_bin/client.svc/ProcessQuery`,
        headers: {
          'X-RequestDigest': res.FormDigestValue
        },
        data: `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions>${payload.join('')}<ObjectPath Id="14" ObjectPathId="13" /><ObjectIdentityQuery Id="15" ObjectPathId="5" /><Query Id="16" ObjectPathId="13"><Query SelectAllProperties="false"><Properties><Property Name="IsComplete" ScalarProperty="true" /><Property Name="PollingInterval" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="53d8499e-d0d2-5000-cb83-9ade5be42ca4|${(this.tenantId as string).substr(pos, (this.tenantId as string).indexOf('&') - pos)}&#xA;SiteProperties&#xA;${formatting.encodeQueryParameter(args.options.url)}" /><Method Id="13" ParentId="5" Name="Update" /></ObjectPaths></Request>`
      };

      response = await request.post<string>(requestOptions);
    }

    return response || sitePropertiesResponse;
  }

  private applySiteDesign(logger: Logger, args: CommandArgs): Promise<void> {
    if (typeof args.options.siteDesignId === 'undefined') {
      return Promise.resolve();
    }

    const options: SpoSiteDesignApplyCommandOptions = {
      webUrl: args.options.url,
      id: args.options.siteDesignId,
      asTask: false,
      debug: this.debug,
      verbose: this.verbose
    };
    return Cli.executeCommand(spoSiteDesignApplyCommand as Command, { options: { ...options, _: [] } });
  }

  private loadSiteIds(siteUrl: string, logger: Logger): Promise<void> {
    if (this.debug) {
      logger.logToStderr('Loading site IDs...');
    }

    const requestOptions: any = {
      url: `${siteUrl}/_api/site?$select=GroupId,Id`,
      headers: {
        accept: 'application/json;odata=nometadata'
      },
      responseType: 'json'
    };

    return request
      .get<{ GroupId: string; Id: string }>(requestOptions)
      .then((siteInfo: { GroupId: string; Id: string }): Promise<void> => {
        this.groupId = siteInfo.GroupId;
        this.siteId = siteInfo.Id;

        if (this.debug) {
          logger.logToStderr(`Retrieved site IDs. siteId: ${this.siteId}, groupId: ${this.groupId}`);
        }

        return Promise.resolve();
      });
  }

  private isGroupConnectedSite(): boolean {
    return this.groupId !== '00000000-0000-0000-0000-000000000000';
  }

  /**
   * Maps the base sharingCapability enum to string array so it can 
   * more easily be used in validation or descriptions.
   */
  protected get sharingCapabilities(): string[] {
    const result: string[] = [];

    for (const sharingCapability in SharingCapabilities) {
      if (typeof SharingCapabilities[sharingCapability] === 'number') {
        result.push(sharingCapability);
      }
    }

    return result;
  }
}

module.exports = new SpoSiteSetCommand();