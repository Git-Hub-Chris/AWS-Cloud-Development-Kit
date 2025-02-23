import * as fs from 'fs-extra';
import * as yaml_cfn from './util/yaml-cfn';

/**
 * Stringify to YAML
 */
export function toYAML(obj: any): string {
  return yaml_cfn.serialize(obj);
}

/**
 * Parse either YAML or JSON
 */
export function deserializeStructure(str: string): any {
  return yaml_cfn.deserialize(str);
}

/**
 * Serialize to either YAML or JSON
 */
export function serializeStructure(object: any, json: boolean) {
  if (json) {
    return JSON.stringify(object, undefined, 2);
  } else {
    return toYAML(object);
  }
}

/**
 * Load a YAML or JSON file from disk
 */
export async function loadStructuredFile(fileName: string) {
  const contents = await fs.readFile(fileName, { encoding: 'utf-8' });
  return deserializeStructure(contents);
}

/**
 * Remove any template elements that we don't want to show users.
 */
export function obscureTemplate(template: any = {}) {
  if (template.Rules) {
    // see https://github.com/aws/aws-cdk/issues/17942
    if (template.Rules.CheckBootstrapVersion) {
      if (Object.keys(template.Rules).length > 1) {
        delete template.Rules.CheckBootstrapVersion;
      } else {
        delete template.Rules;
      }
    }
  }

  return template;
}
