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
const command: Command = require('./message-remove');

describe(commands.MESSAGE_REMOVE, () => {
  let cli: Cli;
  let log: string[];
  let logger: Logger;
  let commandInfo: CommandInfo;

  before(() => {
    cli = Cli.getInstance();
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
    (command as any).items = [];
    sinon.stub(cli, 'getSettingWithDefaultValue').callsFake(((settingName, defaultValue) => defaultValue));
  });

  afterEach(() => {
    sinonUtil.restore([
      request.delete,
      Cli.prompt,
      cli.getSettingWithDefaultValue
    ]);
  });

  after(() => {
    sinon.restore();
    auth.service.connected = false;
  });

  it('has correct name', () => {
    assert.strictEqual(command.name, commands.MESSAGE_REMOVE);
  });

  it('has a description', () => {
    assert.notStrictEqual(command.description, null);
  });

  it('id must be a number', async () => {
    const actual = await command.validate({ options: { id: 'nonumber' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('id is required', async () => {
    const actual = await command.validate({ options: {} }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('calls the messaging endpoint with the right parameters and confirmation', async () => {
    const requestDeleteStub = sinon.stub(request, 'delete').callsFake(async (opts) => {
      if (opts.url === 'https://www.yammer.com/api/v1/messages/10123190123123.json') {
        return;
      }
      throw 'Invalid request';
    });

    await command.action(logger, { options: { debug: true, id: 10123190123123, confirm: true } });
    assert.strictEqual(requestDeleteStub.lastCall.args[0].url, 'https://www.yammer.com/api/v1/messages/10123190123123.json');
  });

  it('calls the messaging endpoint with the right parameters without confirmation', async () => {
    const requestDeleteStub = sinon.stub(request, 'delete').callsFake(async (opts) => {
      if (opts.url === 'https://www.yammer.com/api/v1/messages/10123190123123.json') {
        return;
      }
      throw 'Invalid request';
    });
    sinon.stub(Cli, 'prompt').callsFake(async () => (
      { continue: true }
    ));

    await command.action(logger, { options: { debug: true, id: 10123190123123, confirm: false } });
    assert.strictEqual(requestDeleteStub.lastCall.args[0].url, 'https://www.yammer.com/api/v1/messages/10123190123123.json');
  });

  it('does not call the messaging endpoint without confirmation', async () => {
    const requestDeleteStub = sinon.stub(request, 'delete').callsFake(async (opts) => {
      if (opts.url === 'https://www.yammer.com/api/v1/messages/10123190123123.json') {
        return;
      }
      throw 'Invalid request';
    });

    sinon.stub(Cli, 'prompt').callsFake(async () => (
      { continue: false }
    ));

    await command.action(logger, { options: { debug: true, id: 10123190123123, confirm: false } });
    assert(requestDeleteStub.notCalled);
  });

  it('correctly handles error', async () => {
    sinon.stub(request, 'delete').callsFake(async () => {
      throw {
        "error": {
          "base": "An error has occurred."
        }
      };
    });

    await assert.rejects(command.action(logger, { options: { id: 10123190123123, confirm: true } } as any), new CommandError('An error has occurred.'));
  });

  it('passes validation with parameters', async () => {
    const actual = await command.validate({ options: { id: 10123123 } }, commandInfo);
    assert.strictEqual(actual, true);
  });
});
