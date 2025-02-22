import * as assert from 'assert';
import * as sinon from 'sinon';
import { telemetry } from '../../../../telemetry';
import auth from '../../../../Auth';
import { Cli } from '../../../../cli/Cli';
import { CommandInfo } from '../../../../cli/CommandInfo';
import { Logger } from '../../../../cli/Logger';
import Command, { CommandError } from '../../../../Command';
import request from '../../../../request';
import { pid } from '../../../../utils/pid';
import { session } from '../../../../utils/session';
import { sinonUtil } from '../../../../utils/sinonUtil';
import commands from '../../commands';
const command: Command = require('./plan-list');

describe(commands.PLAN_LIST, () => {
  const ownerGroupId = '233e43d0-dc6a-482e-9b4e-0de7a7bce9b4';
  const ownerGroupName = 'spridermvp';
  const rosterId = 'FeMZFDoK8k2oWmuGE-XFHZcAEwtn';
  const groupsResponse = {
    "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#groups",
    "value": [
      {
        "id": ownerGroupId,
        "deletedDateTime": null,
        "classification": null,
        "createdDateTime": "2021-01-23T17:58:03Z",
        "creationOptions": [
          "Team",
          "ExchangeProvisioningFlags:3552"
        ],
        "description": "Check here for organization announcements and important info.",
        "displayName": "spridermvp",
        "expirationDateTime": null,
        "groupTypes": [
          "Unified"
        ],
        "isAssignableToRole": null,
        "mail": "spridermvp@spridermvp.onmicrosoft.com",
        "mailEnabled": true,
        "mailNickname": "spridermvp",
        "membershipRule": null,
        "membershipRuleProcessingState": null,
        "onPremisesDomainName": null,
        "onPremisesLastSyncDateTime": null,
        "onPremisesNetBiosName": null,
        "onPremisesSamAccountName": null,
        "onPremisesSecurityIdentifier": null,
        "onPremisesSyncEnabled": null,
        "preferredDataLocation": null,
        "preferredLanguage": null,
        "proxyAddresses": [
          "SPO:SPO_fe66856a-ca60-457c-9215-cef02b57bf01@SPO_b30f2eac-f6b4-4f87-9dcb-cdf7ae1f8923",
          "SMTP:spridermvp@spridermvp.onmicrosoft.com"
        ],
        "renewedDateTime": "2021-01-23T17:58:03Z",
        "resourceBehaviorOptions": [
          "HideGroupInOutlook",
          "SubscribeMembersToCalendarEventsDisabled",
          "WelcomeEmailDisabled"
        ],
        "resourceProvisioningOptions": [
          "Team"
        ],
        "securityEnabled": false,
        "securityIdentifier": "S-1-12-1-591283152-1211030634-3876408987-3035217063",
        "theme": null,
        "visibility": "Public",
        "onPremisesProvisioningErrors": []
      }
    ]
  };
  const planResponse = {
    "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#Collection(microsoft.graph.plannerPlan)",
    "@odata.count": 1,
    "value": [
      {
        "createdDateTime": "2021-03-10T17:39:43.1045549Z",
        "owner": "233e43d0-dc6a-482e-9b4e-0de7a7bce9b4",
        "title": "My Planner Plan",
        "id": "opb7bchfZUiFbVWEPL7jPGUABW7f",
        "createdBy": {
          "user": {
            "displayName": null,
            "id": "eded3a2a-8f01-40aa-998a-e4f02ec693ba"
          },
          "application": {
            "displayName": null,
            "id": "31359c7f-bd7e-475c-86db-fdb8c937548e"
          }
        }
      }
    ]
  };
  const formattedResponse = [{
    "createdDateTime": "2021-03-10T17:39:43.1045549Z",
    "owner": "233e43d0-dc6a-482e-9b4e-0de7a7bce9b4",
    "title": "My Planner Plan",
    "id": "opb7bchfZUiFbVWEPL7jPGUABW7f",
    "createdBy": {
      "user": {
        "displayName": null,
        "id": "eded3a2a-8f01-40aa-998a-e4f02ec693ba"
      },
      "application": {
        "displayName": null,
        "id": "31359c7f-bd7e-475c-86db-fdb8c937548e"
      }
    }
  }];

  let cli: Cli;
  let log: string[];
  let logger: Logger;
  let loggerLogSpy: sinon.SinonSpy;
  let commandInfo: CommandInfo;

  before(() => {
    cli = Cli.getInstance();
    sinon.stub(auth, 'restoreAuth').resolves();
    sinon.stub(telemetry, 'trackEvent').returns();
    sinon.stub(pid, 'getProcessName').returns('');
    sinon.stub(session, 'getId').returns('');
    auth.service.connected = true;
    auth.service.accessTokens[(command as any).resource] = {
      accessToken: 'abc',
      expiresOn: new Date()
    };
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
    (command as any).items = [];
    sinon.stub(cli, 'getSettingWithDefaultValue').callsFake(((settingName, defaultValue) => defaultValue));
  });

  afterEach(() => {
    sinonUtil.restore([
      request.get,
      cli.getSettingWithDefaultValue
    ]);
  });

  after(() => {
    sinon.restore();
    auth.service.connected = false;
    auth.service.accessTokens = {};
  });

  it('has correct name', () => {
    assert.strictEqual(command.name, commands.PLAN_LIST);
  });

  it('has a description', () => {
    assert.notStrictEqual(command.description, null);
  });

  it('defines correct properties for the default output', () => {
    assert.deepStrictEqual(command.defaultProperties(), ['id', 'title', 'createdDateTime', 'owner']);
  });

  it('fails validation if the ownerGroupId is not a valid guid.', async () => {
    const actual = await command.validate({
      options: {
        ownerGroupId: 'invalid'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if neither the ownerGroupId nor ownerGroupName nor rosterId are provided.', async () => {
    const actual = await command.validate({ options: {} }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation when ownerGroupId, rosterId and ownerGroupName are specified', async () => {
    const actual = await command.validate({
      options: {
        ownerGroupId: ownerGroupId,
        ownerGroupName: ownerGroupName,
        rosterId: rosterId
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('passes validation when valid ownerGroupId specified', async () => {
    const actual = await command.validate({
      options: {
        ownerGroupId: ownerGroupId
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation when valid ownerGroupName specified', async () => {
    const actual = await command.validate({
      options: {
        ownerGroupName: ownerGroupName
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation when valid rosterId specified', async () => {
    const actual = await command.validate({
      options: {
        rosterId: rosterId
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('correctly list planner plans with given ownerGroupId', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://graph.microsoft.com/v1.0/groups/${ownerGroupId}/planner/plans`) {
        return planResponse;
      }

      throw `Invalid request ${opts.url}`;
    });

    const options: any = {
      ownerGroupId: ownerGroupId
    };

    await command.action(logger, { options: options } as any);
    assert(loggerLogSpy.calledWith(formattedResponse));
  });

  it('correctly list planner plans with given ownerGroupName', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://graph.microsoft.com/v1.0/groups?$filter=displayName eq '${ownerGroupName}'`) {
        return groupsResponse;
      }

      if (opts.url === `https://graph.microsoft.com/v1.0/groups/${ownerGroupId}/planner/plans`) {
        return planResponse;
      }

      throw `Invalid request ${opts.url}`;
    });

    const options: any = {
      ownerGroupName: ownerGroupName
    };

    await command.action(logger, { options: options } as any);
    assert(loggerLogSpy.calledWith(formattedResponse));
  });

  it('correctly list planner plans with given roster', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://graph.microsoft.com/beta/planner/rosters/${rosterId}/plans`) {
        return planResponse;
      }

      throw `Invalid request ${opts.url}`;
    });

    const options: any = {
      rosterId: rosterId
    };

    await command.action(logger, { options: options } as any);
    assert(loggerLogSpy.calledWith(formattedResponse));
  });

  it('correctly handles no plan found with given ownerGroupId', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://graph.microsoft.com/v1.0/groups/${ownerGroupId}/planner/plans`) {
        return {
          "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#Collection(microsoft.graph.plannerPlan)",
          "@odata.count": 0,
          "value": []
        };
      }

      throw `Invalid request ${opts.url}`;
    });

    const options: any = {
      ownerGroupId: ownerGroupId
    };

    await command.action(logger, { options: options } as any);
    assert(loggerLogSpy.calledWith([]));
  });

  it('correctly handles API OData error', async () => {
    sinon.stub(request, 'get').rejects(new Error('An error has occurred.'));

    await assert.rejects(command.action(logger, { options: {} } as any), new CommandError("An error has occurred."));
  });
});
