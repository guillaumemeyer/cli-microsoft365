import * as assert from 'assert';
import * as fs from 'fs';
import * as sinon from 'sinon';
import { telemetry } from '../../../telemetry';
import auth from '../../../Auth';
import { Cli } from '../../../cli/Cli';
import { CommandInfo } from '../../../cli/CommandInfo';
import { Logger } from '../../../cli/Logger';
import Command, { CommandError } from '../../../Command';
import request from '../../../request';
import { pid } from '../../../utils/pid';
import { session } from '../../../utils/session';
import { sinonUtil } from '../../../utils/sinonUtil';
import commands from '../commands';
const command: Command = require('./flow-export');

describe(commands.EXPORT, () => {
  let log: string[];
  let logger: Logger;
  let loggerLogSpy: sinon.SinonSpy;
  let commandInfo: CommandInfo;
  let loggerLogToStderrSpy: sinon.SinonSpy;

  const actualFilename = `20180916t000000zba9d7134cc81499e9884bf70642afac7_20180916042428.zip`;
  const actualFileUrl = `https://bapfeblobprodml.blob.core.windows.net/20180916t000000zb5faa82a53cb4cd29f2a20fde7dbb785/${actualFilename}?sv=2017-04-17&sr=c&sig=AOp0fzKc0dLpY2yovI%2BSHJnQ92GxaMvbWgxyCX5Wwno%3D&se=2018-09-16T12%3A24%3A28Z&sp=rl`;
  const flowDisplayName = `Request manager approval for a Page`;
  const notFoundFlowId = '1c6ee23a-a835-44bc-a4f5-462b658efc12';
  const notFoundEnvironmentId = 'd87a7535-dd31-4437-bfe1-95340acd55c6';
  const foundFlowId = 'f2eb8b37-f624-4b22-9954-b5d0cbb28f8a';
  const foundEnvironmentId = 'cf409f12-a06f-426e-9955-20f5d7a31dd3';
  const nonZipFileFlowId = '694d21e4-49be-4e19-987b-074889e45c75';

  const postFakes = async (opts: any) => {
    if ((opts.url as string).indexOf(notFoundEnvironmentId) > -1) {
      throw {
        "error": {
          "code": "EnvironmentAccessDenied",
          "message": `Access to the environment 'Default-${notFoundEnvironmentId}' is denied.`
        }
      };
    }
    if (JSON.stringify(opts.data || {}).indexOf(notFoundFlowId) > -1) {
      return {
        errors: [{
          "code": "ConnectionAuthorizationFailed",
          "message": `The caller with object id '${foundEnvironmentId}' does not have permission for connection '${notFoundFlowId}' under Api 'shared_logicflows'.`
        }]
      };
    }
    if ((opts.url as string).indexOf('/listPackageResources?api-version=2016-11-01') > -1) {
      return {
        "baseResourceIds": [`/providers/Microsoft.Flow/flows/${foundFlowId}`],
        "resources": { "L1BST1ZJREVSUy9NSUNST1NPRlQuRkxPVy9GTE9XUy9GMkVCOEIzNy1GNjI0LTRCMjItOTk1NC1CNUQwQ0JCMjhGOEI=": { "id": `/providers/Microsoft.Flow/flows/${foundFlowId}`, "name": `${foundFlowId}`, "type": "Microsoft.Flow/flows", "creationType": "Existing, New, Update", "details": { "displayName": flowDisplayName }, "configurableBy": "User", "hierarchy": "Root", "dependsOn": ["L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX1NIQVJFUE9JTlRPTkxJTkU=", "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX1NIQVJFUE9JTlRPTkxJTkUvQ09OTkVDVElPTlMvU0hBUkVELVNIQVJFUE9JTlRPTkwtRjg0NTE4MDktREEwNi00RDQ3LTg3ODYtMTUxMjM4RDUwRTdB", "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX09GRklDRTM2NVVTRVJT", "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX09GRklDRTM2NVVTRVJTL0NPTk5FQ1RJT05TL1NIAAZAGFGH1FBSAHJKFS147VBDSxOUI5QjBELTFFQTUtNDhGOS1BQUM4LTgwRjkyQTFGRjE3OH==", "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJADWNXX8321CGA3JIJDAkVEX0FQUFJPVkFMUw==", "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX0FQUFJPVkFMUy9DT05ORUNUSU9OUy9TSEFSRUQtQVBQUk9WQUxTLUQ2Njc1AUUJNCSWDD1tNGNSAXZ1CNTY4LUFCRDc3MzMyOTMyMA==", "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX1NFTkRNQUlM", "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX1NFTkRNQUlML0NPTk5FQ1RJT05TL1NIQVJFRC1TRU5ETUFJTC05NEUzODVCQi1CNUE3LTRBODgtOURFRC1FMEVFRDAzNTY1Njk="] }, "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX1NIQVJFUE9JTlRPTkxJTkU=": { "id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline", "name": "shared_sharepointonline", "type": "Microsoft.PowerApps/apis", "details": { "displayName": "SharePoint", "iconUri": "https://connectoricons-prod.azureedge.net/sharepointonline/icon_1.0.1019.1195.png" }, "configurableBy": "System", "hierarchy": "Child", "dependsOn": [] }, "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX09GRklDRTM2NVVTRVJT": { "id": "/providers/Microsoft.PowerApps/apis/shared_office365users", "name": "shared_office365users", "type": "Microsoft.PowerApps/apis", "details": { "displayName": "Microsoft 365 Users", "iconUri": "https://connectoricons-prod.azureedge.net/office365users/icon_1.0.1002.1175.png" }, "configurableBy": "System", "hierarchy": "Child", "dependsOn": [] }, "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FAZFGGHDDCAAVEX0FQUFJPVkFMUw==": { "id": "/providers/Microsoft.PowerApps/apis/shared_approvals", "name": "shared_approvals", "type": "Microsoft.PowerApps/apis", "details": { "displayName": "Approvals", "iconUri": "https://psux.azureedge.net/Content/Images/Connectors/Approvals3.svg" }, "configurableBy": "System", "hierarchy": "Child", "dependsOn": [] }, "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX1NFTkRNQUlM": { "id": "/providers/Microsoft.PowerApps/apis/shared_sendmail", "name": "shared_sendmail", "type": "Microsoft.PowerApps/apis", "details": { "displayName": "Mail", "iconUri": "https://az818438.vo.msecnd.net/officialicons/sendmail/icon_1.0.979.1161_83e4f20c-51d8-4c0c-a6f4-653249642047.png" }, "configurableBy": "System", "hierarchy": "Child", "dependsOn": [] }, "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX1NIQVJFUE9JTlRPTkxJTkUvQ09OTkVDVElPTlMvU0hBUkVELVNIQVJFUE9JTlRPTkwtRjg0NTE4MDktREEwNi00RDQ3LTg3ODYtMTUxMjM4RDUwRTdB": { "id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline/connections/shared-sharepointonl-f8451809-da06-4d47-8786-151238d50e7a", "name": "shared-sharepointonl-f8451809-da06-4d47-8786-151238d50e7a", "type": "Microsoft.PowerApps/apis/connections", "creationType": "Existing", "details": { "displayName": "mark.powney@contoso.onmicrosoft.com", "iconUri": "https://az818438.vo.msecnd.net/icons/sharepointonline.png" }, "configurableBy": "User", "hierarchy": "Child", "dependsOn": ["L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX1NIQVJFUE9JTlRPTkxJTkU="] }, "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX0FQUFJPVkFMUy9DT05ORUNUSU9OUy1AFFFVAGJXAAGHQUk9WQUxTLUQ2Njc1RUE5LUZDM0QtNDA4MS1CNTY4LUFCRDc3MzMyOTMyMZ==": { "id": "/providers/Microsoft.PowerApps/apis/shared_approvals/connections/shared-approvals-d6675ea9-fc3d-4081-b568-abd773329320", "name": "shared-approvals-d6675ea9-fc3d-4081-b568-abd773329320", "type": "Microsoft.PowerApps/apis/connections", "creationType": "Existing", "details": { "displayName": "Approvals", "iconUri": "https://connectorassets.blob.core.windows.net/assets/Approvals.svg" }, "configurableBy": "User", "hierarchy": "Child", "dependsOn": ["L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hAZAASFCZ1DVHGVkFMUs=="] }, "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX1NFTkRNQUlML0NPTk5FQ1RJT05TL1NIQVJFRC1TRU5ETUFJTC05NEUzODVCQi1CNUE3LTRBODgtOURFRC1FMEVFRDAzNTY1Njk=": { "id": "/providers/Microsoft.PowerApps/apis/shared_sendmail/connections/shared-sendmail-94e385bb-b5a7-4a88-9ded-e0eed0356569", "name": "shared-sendmail-94e385bb-b5a7-4a88-9ded-e0eed0356569", "type": "Microsoft.PowerApps/apis/connections", "creationType": "Existing", "details": { "displayName": "Mail", "iconUri": "https://az818438.vo.msecnd.net/icons/sendmail.png" }, "configurableBy": "User", "hierarchy": "Child", "dependsOn": ["L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX1NFTkRNQUlM"] }, "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkAZVVDSSAFBRTM2NVVTRVJTL0NPTk5FQ1RJT05TL1NIQVJFRC1PRkZJQ0UzNjVVU0VSLUExOUI5QjBELTFFQTUtNDhGOS1BQUM4LTgwRjkyQTFGRjE3OB==": { "id": "/providers/Microsoft.PowerApps/apis/shared_office365users/connections/shared-office365user-a19b9b0d-1ea5-48f9-aac8-80f92a1ff178", "name": "shared-office365user-a19b9b0d-1ea5-48f9-aac8-80f92a1ff178", "type": "Microsoft.PowerApps/apis/connections", "creationType": "Existing", "details": { "displayName": "mark.powney@contoso.onmicrosoft.com", "iconUri": "https://az818438.vo.msecnd.net/icons/office365users.png" }, "configurableBy": "User", "hierarchy": "Child", "dependsOn": ["L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX09GRklDRTM2NVVTRVJT"] } },
        "status": "Succeeded"
      };
    }
    if ((opts.url as string).indexOf('/exportPackage?api-version=2016-11-01') > -1 && JSON.stringify(opts.data || {}).indexOf(nonZipFileFlowId) > -1) {
      return {
        "details": { "createdTime": "2018-09-16T04:24:28.365117Z", "packageTelemetryId": "448a7d93-7ce3-4e6a-88c9-57cf2479e62e" },
        "packageLink": { "value": `${actualFileUrl.replace('.zip', '.badextension')}` },
        "resources": { "43e3a371-ae70-455a-8050-4b14968ac474": { "id": `/providers/Microsoft.Flow/flows/${nonZipFileFlowId}`, "name": `${nonZipFileFlowId}`, "type": "Microsoft.Flow/flows", "status": "Succeeded", "creationType": "Existing, New, Update", "details": { "displayName": flowDisplayName }, "configurableBy": "User", "hierarchy": "Root", "dependsOn": ["0a6353d7-0770-447b-8d38-60230a1dc26d", "a6f57810-a099-4bf3-b51e-462afcea449e", "59eab504-a13a-40ed-b1f1-1decea0e1465", "1af3bf3f-97c9-4c45-b0fe-36613b9ff78c", "0e560c22-557c-432d-91a7-34f1562fc522", "e30ccca7-546e-4205-8e80-74f9f100b859", "94f5f489-8b4d-4e48-b50a-93514e16f921", "76995bea-58ce-4845-8298-1e29bf87e145"] }, "0a6353d7-0770-447b-8d38-60230a1dc26d": { "id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline", "name": "shared_sharepointonline", "type": "Microsoft.PowerApps/apis", "details": { "displayName": "SharePoint", "iconUri": "https://connectoricons-prod.azureedge.net/sharepointonline/icon_1.0.1019.1195.png" }, "configurableBy": "System", "hierarchy": "Child", "dependsOn": [] }, "a6f57810-a099-4bf3-b51e-462afcea449e": { "id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline/connections/shared-sharepointonl-f8451809-da06-4d47-8786-151238d50e7a", "name": "shared-sharepointonl-f8451809-da06-4d47-8786-151238d50e7a", "type": "Microsoft.PowerApps/apis/connections", "creationType": "Existing", "details": { "displayName": "mark.powney@contoso.onmicrosoft.com", "iconUri": "https://az818438.vo.msecnd.net/icons/sharepointonline.png" }, "configurableBy": "User", "hierarchy": "Child", "dependsOn": ["0a6353d7-0770-447b-8d38-60230a1dc26d"] }, "59eab504-a13a-40ed-b1f1-1decea0e1465": { "id": "/providers/Microsoft.PowerApps/apis/shared_office365users", "name": "shared_office365users", "type": "Microsoft.PowerApps/apis", "details": { "displayName": "Microsoft 365 Users", "iconUri": "https://connectoricons-prod.azureedge.net/office365users/icon_1.0.1002.1175.png" }, "configurableBy": "System", "hierarchy": "Child", "dependsOn": [] }, "1af3bf3f-97c9-4c45-b0fe-36613b9ff78c": { "id": "/providers/Microsoft.PowerApps/apis/shared_office365users/connections/shared-office365user-a19b9b0d-1ea5-48f9-aac8-80f92a1ff178", "name": "shared-office365user-a19b9b0d-1ea5-48f9-aac8-80f92a1ff178", "type": "Microsoft.PowerApps/apis/connections", "creationType": "Existing", "details": { "displayName": "mark.powney@contoso.onmicrosoft.com", "iconUri": "https://az818438.vo.msecnd.net/icons/office365users.png" }, "configurableBy": "User", "hierarchy": "Child", "dependsOn": ["59eab504-a13a-40ed-b1f1-1decea0e1465"] }, "0e560c22-557c-432d-91a7-34f1562fc522": { "id": "/providers/Microsoft.PowerApps/apis/shared_approvals", "name": "shared_approvals", "type": "Microsoft.PowerApps/apis", "details": { "displayName": "Approvals", "iconUri": "https://psux.azureedge.net/Content/Images/Connectors/Approvals3.svg" }, "configurableBy": "System", "hierarchy": "Child", "dependsOn": [] }, "e30ccca7-546e-4205-8e80-74f9f100b859": { "id": "/providers/Microsoft.PowerApps/apis/shared_approvals/connections/shared-approvals-d6675ea9-fc3d-4081-b568-abd773329320", "name": "shared-approvals-d6675ea9-fc3d-4081-b568-abd773329320", "type": "Microsoft.PowerApps/apis/connections", "creationType": "Existing", "details": { "displayName": "Approvals", "iconUri": "https://connectorassets.blob.core.windows.net/assets/Approvals.svg" }, "configurableBy": "User", "hierarchy": "Child", "dependsOn": ["0e560c22-557c-432d-91a7-34f1562fc522"] }, "94f5f489-8b4d-4e48-b50a-93514e16f921": { "id": "/providers/Microsoft.PowerApps/apis/shared_sendmail", "name": "shared_sendmail", "type": "Microsoft.PowerApps/apis", "details": { "displayName": "Mail", "iconUri": "https://az818438.vo.msecnd.net/officialicons/sendmail/icon_1.0.979.1161_83e4f20c-51d8-4c0c-a6f4-653249642047.png" }, "configurableBy": "System", "hierarchy": "Child", "dependsOn": [] }, "76995bea-58ce-4845-8298-1e29bf87e145": { "id": "/providers/Microsoft.PowerApps/apis/shared_sendmail/connections/shared-sendmail-94e385bb-b5a7-4a88-9ded-e0eed0356569", "name": "shared-sendmail-94e385bb-b5a7-4a88-9ded-e0eed0356569", "type": "Microsoft.PowerApps/apis/connections", "creationType": "Existing", "details": { "displayName": "Mail", "iconUri": "https://az818438.vo.msecnd.net/icons/sendmail.png" }, "configurableBy": "User", "hierarchy": "Child", "dependsOn": ["94f5f489-8b4d-4e48-b50a-93514e16f921"] } },
        "status": "Succeeded"
      };
    }
    if ((opts.url as string).indexOf('/exportPackage?api-version=2016-11-01') > -1) {
      return {
        "details": { "createdTime": "2018-09-16T04:24:28.365117Z", "packageTelemetryId": "448a7d93-7ce3-4e6a-88c9-57cf2479e62e" },
        "packageLink": { "value": `${actualFileUrl}` },
        "resources": { "43e3a371-ae70-455a-8050-4b14968ac474": { "id": `/providers/Microsoft.Flow/flows/${foundFlowId}`, "name": `${foundFlowId}`, "type": "Microsoft.Flow/flows", "status": "Succeeded", "creationType": "Existing, New, Update", "details": { "displayName": flowDisplayName }, "configurableBy": "User", "hierarchy": "Root", "dependsOn": ["0a6353d7-0770-447b-8d38-60230a1dc26d", "a6f57810-a099-4bf3-b51e-462afcea449e", "59eab504-a13a-40ed-b1f1-1decea0e1465", "1af3bf3f-97c9-4c45-b0fe-36613b9ff78c", "0e560c22-557c-432d-91a7-34f1562fc522", "e30ccca7-546e-4205-8e80-74f9f100b859", "94f5f489-8b4d-4e48-b50a-93514e16f921", "76995bea-58ce-4845-8298-1e29bf87e145"] }, "0a6353d7-0770-447b-8d38-60230a1dc26d": { "id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline", "name": "shared_sharepointonline", "type": "Microsoft.PowerApps/apis", "details": { "displayName": "SharePoint", "iconUri": "https://connectoricons-prod.azureedge.net/sharepointonline/icon_1.0.1019.1195.png" }, "configurableBy": "System", "hierarchy": "Child", "dependsOn": [] }, "a6f57810-a099-4bf3-b51e-462afcea449e": { "id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline/connections/shared-sharepointonl-f8451809-da06-4d47-8786-151238d50e7a", "name": "shared-sharepointonl-f8451809-da06-4d47-8786-151238d50e7a", "type": "Microsoft.PowerApps/apis/connections", "creationType": "Existing", "details": { "displayName": "mark.powney@contoso.onmicrosoft.com", "iconUri": "https://az818438.vo.msecnd.net/icons/sharepointonline.png" }, "configurableBy": "User", "hierarchy": "Child", "dependsOn": ["0a6353d7-0770-447b-8d38-60230a1dc26d"] }, "59eab504-a13a-40ed-b1f1-1decea0e1465": { "id": "/providers/Microsoft.PowerApps/apis/shared_office365users", "name": "shared_office365users", "type": "Microsoft.PowerApps/apis", "details": { "displayName": "Microsoft 365 Users", "iconUri": "https://connectoricons-prod.azureedge.net/office365users/icon_1.0.1002.1175.png" }, "configurableBy": "System", "hierarchy": "Child", "dependsOn": [] }, "1af3bf3f-97c9-4c45-b0fe-36613b9ff78c": { "id": "/providers/Microsoft.PowerApps/apis/shared_office365users/connections/shared-office365user-a19b9b0d-1ea5-48f9-aac8-80f92a1ff178", "name": "shared-office365user-a19b9b0d-1ea5-48f9-aac8-80f92a1ff178", "type": "Microsoft.PowerApps/apis/connections", "creationType": "Existing", "details": { "displayName": "mark.powney@contoso.onmicrosoft.com", "iconUri": "https://az818438.vo.msecnd.net/icons/office365users.png" }, "configurableBy": "User", "hierarchy": "Child", "dependsOn": ["59eab504-a13a-40ed-b1f1-1decea0e1465"] }, "0e560c22-557c-432d-91a7-34f1562fc522": { "id": "/providers/Microsoft.PowerApps/apis/shared_approvals", "name": "shared_approvals", "type": "Microsoft.PowerApps/apis", "details": { "displayName": "Approvals", "iconUri": "https://psux.azureedge.net/Content/Images/Connectors/Approvals3.svg" }, "configurableBy": "System", "hierarchy": "Child", "dependsOn": [] }, "e30ccca7-546e-4205-8e80-74f9f100b859": { "id": "/providers/Microsoft.PowerApps/apis/shared_approvals/connections/shared-approvals-d6675ea9-fc3d-4081-b568-abd773329320", "name": "shared-approvals-d6675ea9-fc3d-4081-b568-abd773329320", "type": "Microsoft.PowerApps/apis/connections", "creationType": "Existing", "details": { "displayName": "Approvals", "iconUri": "https://connectorassets.blob.core.windows.net/assets/Approvals.svg" }, "configurableBy": "User", "hierarchy": "Child", "dependsOn": ["0e560c22-557c-432d-91a7-34f1562fc522"] }, "94f5f489-8b4d-4e48-b50a-93514e16f921": { "id": "/providers/Microsoft.PowerApps/apis/shared_sendmail", "name": "shared_sendmail", "type": "Microsoft.PowerApps/apis", "details": { "displayName": "Mail", "iconUri": "https://az818438.vo.msecnd.net/officialicons/sendmail/icon_1.0.979.1161_83e4f20c-51d8-4c0c-a6f4-653249642047.png" }, "configurableBy": "System", "hierarchy": "Child", "dependsOn": [] }, "76995bea-58ce-4845-8298-1e29bf87e145": { "id": "/providers/Microsoft.PowerApps/apis/shared_sendmail/connections/shared-sendmail-94e385bb-b5a7-4a88-9ded-e0eed0356569", "name": "shared-sendmail-94e385bb-b5a7-4a88-9ded-e0eed0356569", "type": "Microsoft.PowerApps/apis/connections", "creationType": "Existing", "details": { "displayName": "Mail", "iconUri": "https://az818438.vo.msecnd.net/icons/sendmail.png" }, "configurableBy": "User", "hierarchy": "Child", "dependsOn": ["94f5f489-8b4d-4e48-b50a-93514e16f921"] } },
        "status": "Succeeded"
      };
    }
    if ((opts.url as string).indexOf('/exportToARMTemplate?api-version=2016-11-01') > -1) {
      return {};
    }
    throw 'Invalid request';
  };

  const getFakes = async (opts: any) => {
    if ((opts.url as string).indexOf(notFoundEnvironmentId) > -1) {
      throw {
        "error": {
          "code": "EnvironmentAccessDenied",
          "message": `Access to the environment 'Default-${notFoundEnvironmentId}' is denied.`
        }
      };
    }
    if ((opts.url as string).indexOf(notFoundFlowId) > -1) {
      return {
        errors: [{
          "code": "ConnectionAuthorizationFailed",
          "message": `The caller with object id '${foundEnvironmentId}' does not have permission for connection '${notFoundFlowId}' under Api 'shared_logicflows'.`
        }]
      };
    }
    if (opts.url.match(/\/flows\/[^\?]+\?api-version\=2016-11-01/i)) {
      return {
        "id": `/providers/Microsoft.ProcessSimple/environments/Default-${foundEnvironmentId}/flows/${foundFlowId}`,
        "name": `${foundFlowId}`,
        "properties": { "apiId": "/providers/Microsoft.PowerApps/apis/shared_logicflows", "displayName": flowDisplayName },
        "type": "Microsoft.ProcessSimple/environments/flows"
      };
    }
    if (opts.url === actualFileUrl || opts.url === actualFileUrl.replace('.zip', '.badextension')) {
      return 'zipfilecontents';
    }

    throw 'Invalid request';
  };

  const writeFileSyncFake = () => { };

  before(() => {
    sinon.stub(auth, 'restoreAuth').resolves();
    sinon.stub(telemetry, 'trackEvent').returns();
    sinon.stub(pid, 'getProcessName').returns('');
    sinon.stub(session, 'getId').returns('');
    auth.service.connected = true;
    commandInfo = Cli.getCommandInfo(command);
  });

  beforeEach(() => {
    log = [];
    logger = {
      log: (msg: string) => {
        log.push(msg);
      },
      logRaw: (msg: string) => {
        log.push(msg);
      },
      logToStderr: (msg: string) => {
        log.push(msg);
      }
    };
    loggerLogSpy = sinon.spy(logger, 'log');
    loggerLogToStderrSpy = sinon.spy(logger, 'logToStderr');
  });

  afterEach(() => {
    sinonUtil.restore([
      request.get,
      request.post,
      fs.writeFileSync
    ]);
  });

  after(() => {
    sinon.restore();
    auth.service.connected = false;
  });

  it('has correct name', () => {
    assert.strictEqual(command.name, commands.EXPORT);
  });

  it('has a description', () => {
    assert.notStrictEqual(command.description, null);
  });

  it('exports the specified flow (debug)', async () => {
    sinon.stub(request, 'get').callsFake(getFakes);
    sinon.stub(request, 'post').callsFake(postFakes);
    sinon.stub(fs, 'writeFileSync').callsFake(writeFileSyncFake);

    await command.action(logger, { options: { debug: true, id: `${foundFlowId}`, environmentName: `Default-${foundEnvironmentId}`, format: 'zip' } });
    assert(loggerLogToStderrSpy.calledWith(`File saved to path './${actualFilename}'`));
  });

  it('exports flow to zip does not contain token', async () => {
    const getRequestsStub: sinon.SinonStub = sinon.stub(request, 'get').callsFake(getFakes);
    sinon.stub(request, 'post').callsFake(postFakes);
    sinon.stub(fs, 'writeFileSync').callsFake(writeFileSyncFake);

    await command.action(logger, { options: { debug: true, id: `${foundFlowId}`, environmentName: `Default-${foundEnvironmentId}`, format: 'zip' } });
    assert.strictEqual(getRequestsStub.lastCall.args[0].headers['x-anonymous'], true);
  });

  it('exports the specified flow with a non zip file returned by the API (debug)', async () => {
    sinon.stub(request, 'get').callsFake(getFakes);
    sinon.stub(request, 'post').callsFake(postFakes);
    sinon.stub(fs, 'writeFileSync').callsFake(writeFileSyncFake);

    await command.action(logger, { options: { debug: true, id: `${nonZipFileFlowId}`, environmentName: `Default-${foundEnvironmentId}`, format: 'zip', path: './output.zip', verbose: true } });
    assert(loggerLogToStderrSpy.calledWith(`File saved to path './output.zip'`));
  });

  it('exports the specified flow in json format', async () => {
    sinon.stub(request, 'get').callsFake(getFakes);
    sinon.stub(request, 'post').callsFake(postFakes);
    sinon.stub(fs, 'writeFileSync').callsFake(writeFileSyncFake);

    await command.action(logger, { options: { id: `${foundFlowId}`, environmentName: `Default-${foundEnvironmentId}`, format: 'json' } });
    assert(loggerLogSpy.calledWith(`./${flowDisplayName}.json`));
  });

  it('exports the specified flow in json format with illegal characters', async () => {
    sinon.stub(request, 'get').callsFake(async (opts: any) => {
      if (opts.url.match(/\/flows\/[^\?]+\?api-version\=2016-11-01/i)) {
        return {
          id: `/providers/Microsoft.ProcessSimple/environments/Default-${foundEnvironmentId}/flows/${foundFlowId}`,
          name: `${foundFlowId}`,
          properties: { apiId: "/providers/Microsoft.PowerApps/apis/shared_logicflows", displayName: '\\Flow "<name> | with: Illegal * characters/?' },
          type: "Microsoft.ProcessSimple/environments/flows"
        };
      }

      throw 'Invalid request';
    });
    sinon.stub(request, 'post').callsFake(postFakes);
    sinon.stub(fs, 'writeFileSync').callsFake(writeFileSyncFake);

    await command.action(logger, { options: { id: `${foundFlowId}`, environmentName: `Default-${foundEnvironmentId}`, format: 'json' } });
    assert(loggerLogSpy.calledWith('./_Flow __name_ _ with_ Illegal _ characters__.json'));
  });

  it('exports the specified flow in json format (debug)', async () => {
    sinon.stub(request, 'get').callsFake(getFakes);
    sinon.stub(request, 'post').callsFake(postFakes);
    sinon.stub(fs, 'writeFileSync').callsFake(writeFileSyncFake);

    await command.action(logger, { options: { debug: true, id: `${foundFlowId}`, environmentName: `Default-${foundEnvironmentId}`, format: 'json' } });
    assert(loggerLogToStderrSpy.calledWith(`File saved to path './${flowDisplayName}.json'`));
  });

  it('returns ZIP file location when format specified as ZIP', async () => {
    sinon.stub(request, 'get').callsFake(getFakes);
    sinon.stub(request, 'post').callsFake(postFakes);
    sinon.stub(fs, 'writeFileSync').callsFake(writeFileSyncFake);

    await command.action(logger, { options: { id: `${foundFlowId}`, environmentName: `Default-${foundEnvironmentId}`, format: 'zip' } });
    assert(loggerLogSpy.calledWith(`./${actualFilename}`));
  });

  it('call is made without token when format specified as ZIP', async () => {
    const getRequestsStub: sinon.SinonStub = sinon.stub(request, 'get').callsFake(getFakes);
    sinon.stub(request, 'post').callsFake(postFakes);
    sinon.stub(fs, 'writeFileSync').callsFake(writeFileSyncFake);

    await command.action(logger, { options: { id: `${foundFlowId}`, environmentName: `Default-${foundEnvironmentId}`, format: 'zip' } });
    assert.strictEqual(getRequestsStub.lastCall.args[0].headers['x-anonymous'], true);
  });

  it('nothing returned when path parameter is specified', async () => {
    sinon.stub(request, 'get').callsFake(getFakes);
    sinon.stub(request, 'post').callsFake(postFakes);
    sinon.stub(fs, 'writeFileSync').callsFake(writeFileSyncFake);

    await command.action(logger, { options: { id: `${foundFlowId}`, environmentName: `Default-${foundEnvironmentId}`, format: 'zip', path: './output.zip' } });
    assert(loggerLogSpy.notCalled);
  });

  it('call is made without token when ZIP with specified path', async () => {
    const getRequestsStub: sinon.SinonStub = sinon.stub(request, 'get').callsFake(getFakes);
    sinon.stub(request, 'post').callsFake(postFakes);
    sinon.stub(fs, 'writeFileSync').callsFake(writeFileSyncFake);

    await command.action(logger, { options: { id: `${foundFlowId}`, environmentName: `Default-${foundEnvironmentId}`, format: 'zip', path: './output.zip' } });
    assert.strictEqual(getRequestsStub.lastCall.args[0].headers['x-anonymous'], true);
  });

  it('call is made with suggestedCreationType properties when format specified as ZIP', async () => {
    const resourceIds = ["L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FAZFGGHDDCAAVEX0FQUFJPVkFMUw==", "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkAZVVDSSAFBRTM2NVVTRVJTL0NPTk5FQ1RJT05TL1NIQVJFRC1PRkZJQ0UzNjVVU0VSLUExOUI5QjBELTFFQTUtNDhGOS1BQUM4LTgwRjkyQTFGRjE3OB==", "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX09GRklDRTM2NVVTRVJT", "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX0FQUFJPVkFMUy9DT05ORUNUSU9OUy1AFFFVAGJXAAGHQUk9WQUxTLUQ2Njc1RUE5LUZDM0QtNDA4MS1CNTY4LUFCRDc3MzMyOTMyMZ==", "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX1NFTkRNQUlM", "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX1NFTkRNQUlML0NPTk5FQ1RJT05TL1NIQVJFRC1TRU5ETUFJTC05NEUzODVCQi1CNUE3LTRBODgtOURFRC1FMEVFRDAzNTY1Njk=", "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX1NIQVJFUE9JTlRPTkxJTkU=", "L1BST1ZJREVSUy9NSUNST1NPRlQuUE9XRVJBUFBTL0FQSVMvU0hBUkVEX1NIQVJFUE9JTlRPTkxJTkUvQ09OTkVDVElPTlMvU0hBUkVELVNIQVJFUE9JTlRPTkwtRjg0NTE4MDktREEwNi00RDQ3LTg3ODYtMTUxMjM4RDUwRTdB"];
    const postRequestsStub: sinon.SinonStub = sinon.stub(request, 'post').callsFake(postFakes);
    sinon.stub(request, 'get').callsFake(getFakes);
    sinon.stub(fs, 'writeFileSync').callsFake(writeFileSyncFake);

    await command.action(logger, { options: { id: `${foundFlowId}`, environmentName: `Default-${foundEnvironmentId}`, format: 'zip', path: './output.zip' } });
    assert.strictEqual(postRequestsStub.lastCall.args[0].data.resources["L1BST1ZJREVSUy9NSUNST1NPRlQuRkxPVy9GTE9XUy9GMkVCOEIzNy1GNjI0LTRCMjItOTk1NC1CNUQwQ0JCMjhGOEI="].suggestedCreationType, 'Update');
    resourceIds.forEach((id) => {
      assert.strictEqual(postRequestsStub.lastCall.args[0].data.resources[id].suggestedCreationType, 'Existing');
    });
  });

  it('correctly handles no environment found', async () => {
    sinon.stub(request, 'get').callsFake(getFakes);
    sinon.stub(request, 'post').callsFake(postFakes);

    await assert.rejects(command.action(logger, { options: { environmentName: `Default-${notFoundEnvironmentId}`, id: `${foundFlowId}` } } as any),
      new CommandError(`Access to the environment 'Default-${notFoundEnvironmentId}' is denied.`));
  });

  it('correctly handles Flow not found', async () => {
    sinon.stub(request, 'get').callsFake(getFakes);
    sinon.stub(request, 'post').callsFake(postFakes);

    await assert.rejects(command.action(logger, { options: { environmentName: `Default-${foundEnvironmentId}`, id: notFoundFlowId } } as any),
      new CommandError(`The caller with object id '${foundEnvironmentId}' does not have permission for connection '${notFoundFlowId}' under Api 'shared_logicflows'.`));
  });

  it('fails validation if the id is not a GUID', async () => {
    const actual = await command.validate({ options: { environmentName: `Default-${foundEnvironmentId}`, id: 'abc' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if format is specified as neither JSON nor ZIP', async () => {
    const actual = await command.validate({ options: { environmentName: `Default-${foundEnvironmentId}`, id: `${foundFlowId}`, format: 'text' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if format is specified as JSON and packageCreatedBy parameter is specified', async () => {
    const actual = await command.validate({ options: { environmentName: `Default-${foundEnvironmentId}`, id: `${foundFlowId}`, format: 'json', packageCreatedBy: 'abc' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if format is specified as JSON and packageDescription parameter is specified', async () => {
    const actual = await command.validate({ options: { environmentName: `Default-${foundEnvironmentId}`, id: `${foundFlowId}`, format: 'json', packageDescription: 'abc' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if format is specified as JSON and packageDisplayName parameter is specified', async () => {
    const actual = await command.validate({ options: { environmentName: `Default-${foundEnvironmentId}`, id: `${foundFlowId}`, format: 'json', packageDisplayName: 'abc' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if format is specified as JSON and packageSourceEnvironment parameter is specified', async () => {
    const actual = await command.validate({ options: { environmentName: `Default-${foundEnvironmentId}`, id: `${foundFlowId}`, format: 'json', packageSourceEnvironment: 'abc' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if specified path doesn\'t exist', async () => {
    sinon.stub(fs, 'existsSync').callsFake(() => false);
    const actual = await command.validate({ options: { environmentName: `Default-${foundEnvironmentId}`, id: `${foundFlowId}`, path: '/path/not/found.zip' } }, commandInfo);
    sinonUtil.restore(fs.existsSync);
    assert.notStrictEqual(actual, true);
  });

  it('passes validation when the id and environment specified', async () => {
    const actual = await command.validate({ options: { environmentName: `Default-${foundEnvironmentId}`, id: `${foundFlowId}` } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation when the id and environment specified and format set to JSON', async () => {
    const actual = await command.validate({ options: { environmentName: `Default-${foundEnvironmentId}`, id: `${foundFlowId}`, format: 'json' } }, commandInfo);
    assert.strictEqual(actual, true);
  });
});
