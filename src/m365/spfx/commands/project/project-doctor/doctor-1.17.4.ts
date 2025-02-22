import { FN001008_DEP_react } from './rules/FN001008_DEP_react';
import { FN001009_DEP_react_dom } from './rules/FN001009_DEP_react_dom';
import { FN001022_DEP_office_ui_fabric_react } from './rules/FN001022_DEP_office_ui_fabric_react';
import { FN001035_DEP_fluentui_react } from './rules/FN001035_DEP_fluentui_react';
import { FN002004_DEVDEP_gulp } from './rules/FN002004_DEVDEP_gulp';
import { FN002007_DEVDEP_ajv } from './rules/FN002007_DEVDEP_ajv';
import { FN002013_DEVDEP_types_webpack_env } from './rules/FN002013_DEVDEP_types_webpack_env';
import { FN002015_DEVDEP_types_react } from './rules/FN002015_DEVDEP_types_react';
import { FN002016_DEVDEP_types_react_dom } from './rules/FN002016_DEVDEP_types_react_dom';
import { FN002019_DEVDEP_microsoft_rush_stack_compiler } from './rules/FN002019_DEVDEP_microsoft_rush_stack_compiler';

module.exports = [
  new FN001008_DEP_react('17'),
  new FN001009_DEP_react_dom('17'),
  new FN001022_DEP_office_ui_fabric_react('^7.199.1'),
  new FN001035_DEP_fluentui_react('^7.199.1'),
  new FN002004_DEVDEP_gulp('4.0.2'),
  new FN002007_DEVDEP_ajv('^6.12.5'),
  new FN002013_DEVDEP_types_webpack_env('~1.15.2'),
  new FN002015_DEVDEP_types_react('17'),
  new FN002016_DEVDEP_types_react_dom('17'),
  new FN002019_DEVDEP_microsoft_rush_stack_compiler(['4.5'])
];