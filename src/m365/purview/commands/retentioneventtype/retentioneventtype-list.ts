import { Logger } from '../../../../cli/Logger';
import { odata } from '../../../../utils/odata';
import GraphCommand from '../../../base/GraphCommand';
import commands from '../../commands';

class PurviewRetentionEventTypeListCommand extends GraphCommand {
  public get name(): string {
    return commands.RETENTIONEVENTTYPE_LIST;
  }

  public get description(): string {
    return 'Get a list of retention event types';
  }

  public defaultProperties(): string[] | undefined {
    return ['id', 'displayName', 'createdDateTime'];
  }

  public async commandAction(logger: Logger): Promise<void> {
    try {
      const items = await odata.getAllItems(`${this.resource}/v1.0/security/triggerTypes/retentionEventTypes`);
      logger.log(items);
    }
    catch (err: any) {
      this.handleRejectedODataJsonPromise(err);
    }
  }
}

module.exports = new PurviewRetentionEventTypeListCommand();