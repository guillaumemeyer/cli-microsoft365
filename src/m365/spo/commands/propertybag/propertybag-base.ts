import { Logger } from '../../../../cli/Logger';
import config from '../../../../config';
import request from '../../../../request';
import { formatting } from '../../../../utils/formatting';
import { ClientSvcResponse, ClientSvcResponseContents, IdentityResponse, spo } from '../../../../utils/spo';
import SpoCommand from '../../../base/SpoCommand';
import { BasePermissions, PermissionKind } from '../../base-permissions';

export interface Property {
  key: string;
  value: any;
}

export abstract class SpoPropertyBagBaseCommand extends SpoCommand {
  /**
   * Gets or sets site form Digest Value to be used 
   * with multiple methods.
   */
  protected formDigestValue: string;

  constructor() {
    super();
    this.formDigestValue = '';
  }

  /**
   * Gets property bag for a folder or site rootFolder of a site where return type is "_ObjectType_\":\"SP.Folder\".
   * This method is executed when folder option is specified. PnP PowerShell behaves the same way.
   */
  protected async getFolderPropertyBag(identityResp: IdentityResponse, webUrl: string, folder: string, logger: Logger): Promise<any> {
    let serverRelativeUrl: string = folder;
    if (identityResp.serverRelativeUrl !== '/') {
      serverRelativeUrl = `${identityResp.serverRelativeUrl}${serverRelativeUrl}`;
    }

    const requestOptions: any = {
      url: `${webUrl}/_vti_bin/client.svc/ProcessQuery`,
      headers: {
        'X-RequestDigest': this.formDigestValue
      },
      data: `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="10" ObjectPathId="9" /><ObjectIdentityQuery Id="11" ObjectPathId="9" /><Query Id="12" ObjectPathId="9"><Query SelectAllProperties="false"><Properties><Property Name="Properties" SelectAll="true"><Query SelectAllProperties="false"><Properties /></Query></Property></Properties></Query></Query></Actions><ObjectPaths><Method Id="9" ParentId="5" Name="GetFolderByServerRelativeUrl"><Parameters><Parameter Type="String">${serverRelativeUrl}</Parameter></Parameters></Method><Identity Id="5" Name="${identityResp.objectIdentity}" /></ObjectPaths></Request>`
    };
    try {
      const res: string = await request.post<string>(requestOptions);

      if (this.debug) {
        logger.logToStderr('Attempt to get Properties key values');
      }

      const json: ClientSvcResponse = JSON.parse(res);

      const contents: ClientSvcResponseContents = json.find(x => { return x['ErrorInfo']; });
      if (contents && contents.ErrorInfo) {
        throw contents.ErrorInfo.ErrorMessage || 'ClientSvc unknown error';
      }

      const propertiesObj = json.find(x => { return x['Properties']; });
      if (propertiesObj) {
        return propertiesObj['Properties'];
      }

      throw 'Cannot proceed. Properties not found'; // this is not suppose to happen
    }
    catch (err: any) {
      throw err;
    }
  }

  /**
   * Gets property bag for site or sitecollection where return type is "_ObjectType_\":\"SP.Web\".
   * This method is executed when no folder specified. PnP PowerShell behaves the same way.
   */
  protected async getWebPropertyBag(identityResp: IdentityResponse, webUrl: string, logger: Logger): Promise<any> {
    const requestOptions: any = {
      url: `${webUrl}/_vti_bin/client.svc/ProcessQuery`,
      headers: {
        'X-RequestDigest': this.formDigestValue
      },
      data: `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Query Id="97" ObjectPathId="5"><Query SelectAllProperties="false"><Properties><Property Name="ServerRelativeUrl" ScalarProperty="true" /><Property Name="AllProperties" SelectAll="true"><Query SelectAllProperties="false"><Properties /></Query></Property></Properties></Query></Query></Actions><ObjectPaths><Identity Id="5" Name="${identityResp.objectIdentity}" /></ObjectPaths></Request>`
    };

    try {
      const res: any = await request.post(requestOptions);
      if (this.debug) {
        logger.logToStderr('Attempt to get AllProperties key values');
      }

      const json: ClientSvcResponse = JSON.parse(res);
      const contents: ClientSvcResponseContents = json.find(x => { return x['ErrorInfo']; });
      if (contents && contents.ErrorInfo) {
        throw contents.ErrorInfo.ErrorMessage || 'ClientSvc unknown error';
      }

      const allPropertiesObj = json.find(x => { return x['AllProperties']; });
      if (allPropertiesObj) {
        return allPropertiesObj['AllProperties'];
      }

      throw 'Cannot proceed. AllProperties not found'; // this is not supposed to happen
    }
    catch (err: any) {
      throw err;
    }
  }

  /**
   * The property bag item data returned from the client.svc/ProcessQuery response
   * has to be formatted before displayed since the key, value objects
   * carry extra information or there might be a value,
   * that should to be formatted depending on the data type.
   */
  protected formatProperty(objKey: string, objValue: any): Property {
    if (objKey.indexOf('$  Int32') > -1) {

      // format if the propery value is integer
      // the int returned has the following format of the property key,
      // 'vti_folderitemcount$  Int32'. To normalize that, the extra string
      // '$  Int32' has to be removed from the key, also parseInt is used to 
      // ensure the json object returns number

      objKey = objKey.replace('$  Int32', '');
      objValue = parseInt(objValue);
    }
    else {
      if (typeof objValue === 'string' && objValue.indexOf('/Date(') > -1) {

        // format if the property value is date
        // the date returned has the following format ex. /Date(2017,10,7,11,29,31,0)/.
        // That has to be turned into JavaScript Date object

        const date = objValue.replace('/Date(', '').replace(')/', '').split(',').map(Number);
        objValue = new Date(date[0], date[1], date[2], date[3], date[4], date[5], date[6]);
      }
      else {
        if (objValue === 'true' || objValue === 'false') {

          // format if the property value is boolean
          objValue = (objValue === 'true');
        }
      }
    }

    return { key: objKey, value: objValue } as Property;
  }

  public static async setProperty(name: string, value: string, webUrl: string, formDigest: string, identityResp: IdentityResponse, logger: Logger, debug: boolean, folder?: string): Promise<any> {
    let objectType: string = 'AllProperties';
    if (folder) {
      objectType = 'Properties';
    }

    const requestOptions: any = {
      url: `${webUrl}/_vti_bin/client.svc/ProcessQuery`,
      headers: {
        'X-RequestDigest': formDigest
      },
      data: `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><Method Name="SetFieldValue" Id="206" ObjectPathId="205"><Parameters><Parameter Type="String">${formatting.escapeXml(name)}</Parameter><Parameter Type="String">${formatting.escapeXml(value)}</Parameter></Parameters></Method><Method Name="Update" Id="207" ObjectPathId="198" /></Actions><ObjectPaths><Property Id="205" ParentId="198" Name="${objectType}" /><Identity Id="198" Name="${identityResp.objectIdentity}" /></ObjectPaths></Request>`
    };

    try {
      const res: any = await request.post(requestOptions);
      const json: ClientSvcResponse = JSON.parse(res);
      const contents: ClientSvcResponseContents = json.find(x => { return x['ErrorInfo']; });
      if (contents && contents.ErrorInfo) {
        throw contents.ErrorInfo.ErrorMessage || 'ClientSvc unknown error';
      }
      else {
        return res;
      }
    }
    catch (err: any) {
      throw err;
    }
  }

  /**
   * Detects if the site in question has no script enabled or not. Detection is done
   * by verifying if the AddAndCustomizePages permission is missing
   * Note: Can later be moved as common method if required for other cli checks.
   * @param webIdentityResp web object identity response returned from client.svc/ProcessQuery. Has format like <GUID>|<GUID>:site:<GUID>:web:<GUID>
   * @param options command options
   * @param cmd command instance
   */
  public static async isNoScriptSite(webUrl: string, formDigest: string, webIdentityResp: IdentityResponse, logger: Logger, debug: boolean): Promise<boolean> {
    try {
      const basePermissionsResp: BasePermissions = await spo.getEffectiveBasePermissions(webIdentityResp.objectIdentity, webUrl, formDigest, logger, debug);
      return basePermissionsResp.has(PermissionKind.AddAndCustomizePages) === false;
    }
    catch (err) {
      throw err;
    }
  }
}