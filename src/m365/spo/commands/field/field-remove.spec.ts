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
const command: Command = require('./field-remove');

describe(commands.FIELD_REMOVE, () => {
  let cli: Cli;
  let log: any[];
  let logger: Logger;
  let commandInfo: CommandInfo;
  let requests: any[];
  let promptOptions: any;

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

    sinon.stub(Cli, 'prompt').callsFake(async (options: any) => {
      promptOptions = options;
      return { continue: false };
    });

    requests = [];
    sinon.stub(cli, 'getSettingWithDefaultValue').callsFake(((settingName, defaultValue) => defaultValue));
  });

  afterEach(() => {
    sinonUtil.restore([
      request.post,
      request.get,
      Cli.prompt,
      cli.getSettingWithDefaultValue
    ]);
  });

  after(() => {
    sinon.restore();
    auth.service.connected = false;
  });

  it('has correct name', () => {
    assert.strictEqual(command.name, commands.FIELD_REMOVE);
  });

  it('has a description', () => {
    assert.notStrictEqual(command.description, null);
  });

  it('prompts before removing field when confirmation argument not passed (id)', async () => {
    await command.action(logger, { options: { id: 'b2307a39-e878-458b-bc90-03bc578531d6', webUrl: 'https://contoso.sharepoint.com' } });
    let promptIssued = false;

    if (promptOptions && promptOptions.type === 'confirm') {
      promptIssued = true;
    }

    assert(promptIssued);
  });

  it('prompts before removing field when confirmation argument not passed (title)', async () => {
    await command.action(logger, { options: { title: 'myfield1', webUrl: 'https://contoso.sharepoint.com' } });
    let promptIssued = false;

    if (promptOptions && promptOptions.type === 'confirm') {
      promptIssued = true;
    }

    assert(promptIssued);
  });

  it('prompts before removing list column when confirmation argument not passed', async () => {
    await command.action(logger, { options: { title: 'myfield1', webUrl: 'https://contoso.sharepoint.com', listTitle: 'My List' } });
    let promptIssued = false;

    if (promptOptions && promptOptions.type === 'confirm') {
      promptIssued = true;
    }

    assert(promptIssued);
  });

  it('aborts removing field when prompt not confirmed', async () => {
    sinonUtil.restore(Cli.prompt);
    sinon.stub(Cli, 'prompt').resolves({ continue: false });

    await command.action(logger, { options: { id: 'b2307a39-e878-458b-bc90-03bc578531d6', webUrl: 'https://contoso.sharepoint.com' } });
    assert(requests.length === 0);
  });

  it('aborts removing field when prompt not confirmed and passing the group parameter', async () => {
    sinonUtil.restore(Cli.prompt);
    sinon.stub(Cli, 'prompt').resolves({ continue: false });

    await command.action(logger, { options: { group: 'MyGroup', webUrl: 'https://contoso.sharepoint.com' } });
    assert(requests.length === 0);
  });

  it('removes the field when prompt confirmed', async () => {
    sinon.stub(request, 'post').callsFake(async (opts) => {
      requests.push(opts);

      if ((opts.url as string).indexOf(`/_api/web/fields(guid'`) > -1) {
        if (opts.headers &&
          opts.headers.accept &&
          (opts.headers.accept as string).indexOf('application/json') === 0) {
          return;
        }
      }

      throw 'Invalid request';
    });

    sinonUtil.restore(Cli.prompt);
    sinon.stub(Cli, 'prompt').resolves({ continue: true });
    await assert.rejects(command.action(logger, { options: { id: 'b2307a39-e878-458b-bc90-03bc578531d6', webUrl: 'https://contoso.sharepoint.com' } }));
    let correctRequestIssued = false;
    requests.forEach(r => {
      if (r.url.indexOf(`/_api/web/fields/getbyid('`) > -1 &&
        r.headers.accept &&
        r.headers.accept.indexOf('application/json') === 0) {
        correctRequestIssued = true;
      }
    });
    assert(correctRequestIssued);
  });

  it('command correctly handles field get reject request', async () => {
    const err = 'Invalid request';
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf('/_api/web/fields/getbyinternalnameortitle(') > -1) {
        throw err;
      }

      throw 'Invalid request';
    });

    const actionTitle: string = 'field1';

    await assert.rejects(command.action(logger, {
      options: {
        debug: true,
        title: actionTitle,
        webUrl: 'https://contoso.sharepoint.com',
        confirm: true
      }
    }), new CommandError(err));
  });

  it('uses correct API url when id option is passed', async () => {
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf('/_api/web/fields/getbyid(\'') > -1) {
        return 'Correct Url';
      }

      throw 'Invalid request';
    });

    const actionId: string = '0CD891EF-AFCE-4E55-B836-FCE03286CCCF';

    await command.action(logger, {
      options: {
        id: actionId,
        webUrl: 'https://contoso.sharepoint.com',
        confirm: true
      }
    });
  });

  it('calls the correct remove url when id and list url specified', async () => {
    const getStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_api/web/lists`) > -1) {
        return {
          "Id": "03e45e84-1992-4d42-9116-26f756012634"
        };
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger, { options: { verbose: true, webUrl: 'https://contoso.sharepoint.com/sites/portal', id: '03e45e84-1992-4d42-9116-26f756012634', listUrl: 'Lists/Events', confirm: true } }));
    assert.strictEqual(getStub.lastCall.args[0].url, 'https://contoso.sharepoint.com/sites/portal/_api/web/GetList(\'%2Fsites%2Fportal%2FLists%2FEvents\')/fields/getbyid(\'03e45e84-1992-4d42-9116-26f756012634\')');
  });

  it('calls group and deletes two fields and asks for confirmation', async () => {
    sinonUtil.restore(Cli.prompt);
    sinon.stub(Cli, 'prompt').resolves({ continue: true });

    const getStub = sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/portal/_api/web/GetList(\'%2Fsites%2Fportal%2FLists%2FEvents\')/fields`) {
        return {
          "value": [{
            "Id": "03e45e84-1992-4d42-9116-26f756012634",
            "Group": "MyGroup"
          },
          {
            "Id": "03e45e84-1992-4d42-9116-26f756012635",
            "Group": "MyGroup"
          },
          {
            "Id": "03e45e84-1992-4d42-9116-26f756012636",
            "Group": "DifferentGroup"
          }]
        };
      }
      throw 'Invalid request';
    });

    const deletion = sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_api/web/GetList(\'%2Fsites%2Fportal%2FLists%2FEvents\')/fields/getbyid(\'03e45e84-1992-4d42-9116-26f756012634\')`) > -1) {
        return {
          "Id": "03e45e84-1992-4d42-9116-26f756012634"
        };
      }

      if ((opts.url as string).indexOf(`/_api/web/GetList(\'%2Fsites%2Fportal%2FLists%2FEvents\')/fields/getbyid(\'03e45e84-1992-4d42-9116-26f756012635\')`) > -1) {
        return {
          "Id": "03e45e84-1992-4d42-9116-26f756012635"
        };
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { verbose: true, webUrl: 'https://contoso.sharepoint.com/sites/portal', group: 'MyGroup', listUrl: '/sites/portal/Lists/Events' } });
    assert(getStub.called);
    assert.strictEqual(deletion.firstCall.args[0].url, 'https://contoso.sharepoint.com/sites/portal/_api/web/GetList(\'%2Fsites%2Fportal%2FLists%2FEvents\')/fields/getbyid(\'03e45e84-1992-4d42-9116-26f756012634\')');
    assert.strictEqual(deletion.secondCall.args[0].url, 'https://contoso.sharepoint.com/sites/portal/_api/web/GetList(\'%2Fsites%2Fportal%2FLists%2FEvents\')/fields/getbyid(\'03e45e84-1992-4d42-9116-26f756012635\')');
    assert.strictEqual(deletion.callCount, 2);
  });

  it('calls group and deletes two fields', async () => {
    const getStub = sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/portal/_api/web/fields`) {
        return {
          "value": [{
            "Id": "03e45e84-1992-4d42-9116-26f756012634",
            "Group": "MyGroup"
          },
          {
            "Id": "03e45e84-1992-4d42-9116-26f756012635",
            "Group": "MyGroup"
          },
          {
            "Id": "03e45e84-1992-4d42-9116-26f756012636",
            "Group": "DifferentGroup"
          }]
        };
      }
      throw 'Invalid request';
    });

    const deletion = sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_api/web/fields/getbyid(\'03e45e84-1992-4d42-9116-26f756012634\')`) > -1) {
        return {
          "Id": "03e45e84-1992-4d42-9116-26f756012634"
        };
      }

      if ((opts.url as string).indexOf(`/_api/web/fields/getbyid(\'03e45e84-1992-4d42-9116-26f756012635\')`) > -1) {
        return {
          "Id": "03e45e84-1992-4d42-9116-26f756012635"
        };
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { verbose: true, webUrl: 'https://contoso.sharepoint.com/sites/portal', group: 'MyGroup', confirm: true } });
    assert(getStub.called);
    assert.strictEqual(deletion.firstCall.args[0].url, 'https://contoso.sharepoint.com/sites/portal/_api/web/fields/getbyid(\'03e45e84-1992-4d42-9116-26f756012634\')');
    assert.strictEqual(deletion.secondCall.args[0].url, 'https://contoso.sharepoint.com/sites/portal/_api/web/fields/getbyid(\'03e45e84-1992-4d42-9116-26f756012635\')');
    assert.strictEqual(deletion.callCount, 2);
  });

  it('calls group and deletes no fields', async () => {
    const getStub = sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/portal/_api/web/fields`) {
        return {
          "value": [{
            "Id": "03e45e84-1992-4d42-9116-26f756012634",
            "Group": "MyGroup"
          },
          {
            "Id": "03e45e84-1992-4d42-9116-26f756012635",
            "Group": "MyGroup"
          },
          {
            "Id": "03e45e84-1992-4d42-9116-26f756012636",
            "Group": "DifferentGroup"
          }]
        };
      }
      throw 'Invalid request';
    });

    const deletion = sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_api/web/fields`) > -1) {
        return {
          "Id": "03e45e84-1992-4d42-9116-26f756012634"
        };
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { verbose: true, webUrl: 'https://contoso.sharepoint.com/sites/portal', group: 'MyGroup1', confirm: true } });
    assert(getStub.called);
    assert(deletion.notCalled);
  });

  it('handles failure when get operation fails', async () => {
    const error = {
      error: {
        'odata.error': {
          code: '-1, Microsoft.SharePoint.Client.InvalidOperationException',
          message: {
            value: 'Invalid request'
          }
        }
      }
    };

    const getStub = sinon.stub(request, 'get').rejects(error);

    const deletion = sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_api/web/fields/getbyid(\'03e45e84-1992-4d42-9116-26f756012635\')`) > -1) {
        return {
          "Id": "03e45e84-1992-4d42-9116-26f756012635"
        };
      }

      if ((opts.url as string).indexOf(`/_api/web/fields/getbyid(\'03e45e84-1992-4d42-9116-26f756012634\')`) > -1) {
        throw error;
      }

      throw error;
    });

    await assert.rejects(command.action(logger, { options: { verbose: true, webUrl: 'https://contoso.sharepoint.com/sites/portal', group: 'MyGroup', confirm: true } } as any),
      new CommandError('Invalid request'));
    assert(getStub.called);
    assert(deletion.notCalled);
  });

  it('handles failure when one deletion fails', async () => {
    const error = {
      error: {
        'odata.error': {
          code: '-1, Microsoft.SharePoint.Client.InvalidOperationException',
          message: {
            value: 'Invalid request'
          }
        }
      }
    };
    const getStub = sinon.stub(request, 'get').callsFake(async (opts) => {
      if (opts.url === `https://contoso.sharepoint.com/sites/portal/_api/web/fields`) {
        return {
          "value": [{
            "Id": "03e45e84-1992-4d42-9116-26f756012634",
            "Group": "MyGroup"
          },
          {
            "Id": "03e45e84-1992-4d42-9116-26f756012635",
            "Group": "MyGroup"
          },
          {
            "Id": "03e45e84-1992-4d42-9116-26f756012636",
            "Group": "DifferentGroup"
          }]
        };
      }
      throw 'Invalid request';
    });

    const deletion = sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_api/web/fields/getbyid(\'03e45e84-1992-4d42-9116-26f756012635\')`) > -1) {
        return {
          "Id": "03e45e84-1992-4d42-9116-26f756012635"
        };
      }

      if ((opts.url as string).indexOf(`/_api/web/fields/getbyid(\'03e45e84-1992-4d42-9116-26f756012634\')`) > -1) {
        throw error;
      }

      throw error;
    });

    await assert.rejects(command.action(logger, { options: { verbose: true, webUrl: 'https://contoso.sharepoint.com/sites/portal', group: 'MyGroup', confirm: true } } as any),
      new CommandError(error.error['odata.error'].message.value));
    assert(getStub.called);
    assert.strictEqual(deletion.firstCall.args[0].url, 'https://contoso.sharepoint.com/sites/portal/_api/web/fields/getbyid(\'03e45e84-1992-4d42-9116-26f756012634\')');
    assert.strictEqual(deletion.callCount, 2);
  });

  it('calls the correct get url when field title and list title specified (verbose)', async () => {
    const getStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_api/web/lists`) > -1) {
        return {
          "Id": "03e45e84-1992-4d42-9116-26f756012634"
        };
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { debug: true, verbose: true, webUrl: 'https://contoso.sharepoint.com/sites/portal', title: 'Title', listTitle: 'Documents', confirm: true } });
    assert.strictEqual(getStub.lastCall.args[0].url, 'https://contoso.sharepoint.com/sites/portal/_api/web/lists/getByTitle(\'Documents\')/fields/getbyinternalnameortitle(\'Title\')');
  });

  it('calls the correct get url when field title and list title specified', async () => {
    const getStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_api/web/lists`) > -1) {
        return {
          "Id": "03e45e84-1992-4d42-9116-26f756012634"
        };
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { webUrl: 'https://contoso.sharepoint.com/sites/portal', title: 'Title', listTitle: 'Documents', confirm: true } });
    assert.strictEqual(getStub.lastCall.args[0].url, 'https://contoso.sharepoint.com/sites/portal/_api/web/lists/getByTitle(\'Documents\')/fields/getbyinternalnameortitle(\'Title\')');
  });

  it('calls the correct get url when field title and list url specified', async () => {
    const getStub = sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_api/web/lists`) > -1) {
        return {
          "Id": "03e45e84-1992-4d42-9116-26f756012634"
        };
      }

      throw 'Invalid request';
    });

    await command.action(logger, { options: { debug: true, webUrl: 'https://contoso.sharepoint.com/sites/portal', title: 'Title', listId: '03e45e84-1992-4d42-9116-26f756012634', confirm: true } });
    assert.strictEqual(getStub.lastCall.args[0].url, 'https://contoso.sharepoint.com/sites/portal/_api/web/lists(guid\'03e45e84-1992-4d42-9116-26f756012634\')/fields/getbyinternalnameortitle(\'Title\')');
  });

  it('correctly handles site column not found', async () => {
    const error = {
      error: {
        'odata.error': {
          code: '-1, Microsoft.SharePoint.Client.InvalidOperationException',
          message: {
            value: 'Invalid request'
          }
        }
      }
    };
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf('/_api/web/fields/getbyinternalnameortitle(') > -1) {
        throw error;
      }
      throw 'Invalid request';
    });
    const actionTitle: string = 'field1';

    await assert.rejects(command.action(logger, { options: { debug: true, webUrl: 'https://contoso.sharepoint.com/sites/portal', title: actionTitle, confirm: true } } as any),
      new CommandError(error.error['odata.error'].message.value));
  });

  it('correctly handles list column not found', async () => {
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_api/web/lists/getByTitle('Documents')/fields/getbyid(`) > -1) {
        throw {
          error: {
            "odata.error": {
              "code": "-2147024809, System.ArgumentException",
              "message": {
                "lang": "en-US",
                "value": "Invalid field name. {03e45e84-1992-4d42-9116-26f756012634}  /sites/portal/Shared Documents"
              }
            }
          }
        };
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger, { options: { debug: true, webUrl: 'https://contoso.sharepoint.com/sites/portal', id: '03e45e84-1992-4d42-9116-26f756012634', listTitle: 'Documents', confirm: true } } as any),
      new CommandError('Invalid field name. {03e45e84-1992-4d42-9116-26f756012634}  /sites/portal/Shared Documents'));
  });

  it('correctly handles list not found', async () => {
    sinon.stub(request, 'post').callsFake(async (opts) => {
      if ((opts.url as string).indexOf(`/_api/web/lists/getByTitle('Documents')/fields/getbyid(`) > -1) {
        throw {
          error: {
            "odata.error": {
              "code": "-1, System.ArgumentException",
              "message": {
                "lang": "en-US",
                "value": "List 'Documents' does not exist at site with URL 'https://contoso.sharepoint.com/sites/portal'."
              }
            }
          }
        };
      }

      throw 'Invalid request';
    });

    await assert.rejects(command.action(logger, { options: { debug: true, webUrl: 'https://contoso.sharepoint.com/sites/portal', id: '03e45e84-1992-4d42-9116-26f756012634', listTitle: 'Documents', confirm: true } } as any),
      new CommandError("List 'Documents' does not exist at site with URL 'https://contoso.sharepoint.com/sites/portal'."));
  });

  it('supports specifying URL', () => {
    const options = command.options;
    let containsTypeOption = false;
    options.forEach(o => {
      if (o.option.indexOf('<webUrl>') > -1) {
        containsTypeOption = true;
      }
    });
    assert(containsTypeOption);
  });

  it('fails validation if both id and title options are not passed', async () => {
    const actual = await command.validate({ options: { webUrl: 'https://contoso.sharepoint.com', confirm: true, listTitle: 'Documents' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if the url option is not a valid SharePoint site URL', async () => {
    const actual = await command.validate({ options: { webUrl: 'foo.com', id: '0CD891EF-AFCE-4E55-B836-FCE03286CCCF' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('passes validation if the url option is a valid SharePoint site URL', async () => {
    const actual = await command.validate({ options: { webUrl: 'https://contoso.sharepoint.com', id: '0CD891EF-AFCE-4E55-B836-FCE03286CCCF' } }, commandInfo);
    assert(actual);
  });

  it('fails validation if the field ID option is not a valid GUID', async () => {
    const actual = await command.validate({ options: { webUrl: 'https://contoso.sharepoint.com', id: '12345' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('passes validation if the field ID option is a valid GUID', async () => {
    const actual = await command.validate({ options: { webUrl: 'https://contoso.sharepoint.com', id: '0CD891EF-AFCE-4E55-B836-FCE03286CCCF' } }, commandInfo);
    assert(actual);
  });

  it('fails validation if the list ID is not a valid GUID', async () => {
    const actual = await command.validate({ options: { webUrl: 'https://contoso.sharepoint.com', id: '0CD891EF-AFCE-4E55-B836-FCE03286CCCF', listId: 'abc' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('passes validation when all required parameters are valid', async () => {
    const actual = await command.validate({
      options: {
        webUrl: 'https://contoso.sharepoint.com',
        id: 'BC448D63-484F-49C5-AB8C-96B14AA68D50',
        confirm: true
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });
});
