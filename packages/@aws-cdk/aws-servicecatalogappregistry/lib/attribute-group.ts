import { CfnResourceShare } from '@aws-cdk/aws-ram';
import * as cdk from '@aws-cdk/core';
import { getPrincipalsforSharing, hashValues, ShareOptions } from './common';
import { InputValidator } from './private/validation';
import { CfnAttributeGroup } from './servicecatalogappregistry.generated';

// keep this import separate from other imports to reduce chance for merge conflicts with v2-main
// eslint-disable-next-line no-duplicate-imports, import/order
import { Construct } from 'constructs';

/**
 * A Service Catalog AppRegistry Attribute Group.
 */
export interface IAttributeGroup extends cdk.IResource {
  /**
   * The ARN of the attribute group.
   * @attribute
   */
  readonly attributeGroupArn: string;

  /**
   * The ID of the attribute group.
   * @attribute
   */
  readonly attributeGroupId: string;

  /**
   * Share the attribute group resource with other IAM entities, accounts, or OUs.
   * @param shareOptions The options for the share.
   */
  shareResource(shareOptions: ShareOptions): void;
}

/**
 * Properties for a Service Catalog AppRegistry Attribute Group
 */
export interface AttributeGroupProps {
  /**
   * Enforces a particular physical attribute group name.
   */
  readonly attributeGroupName: string;

  /**
   * Description for attribute group.
   * @default - No description provided
   */
  readonly description?: string;

  /**
   * A JSON of nested key-value pairs that represent the attributes in the group.
   * Attributes maybe an empty JSON '{}', but must be explicitly stated.
   */
  readonly attributes: { [key: string]: any };
}

abstract class AttributeGroupBase extends cdk.Resource implements IAttributeGroup {
  public abstract readonly attributeGroupArn: string;
  public abstract readonly attributeGroupId: string;

  public shareResource(shareOptions: ShareOptions): void {
    const principals = getPrincipalsforSharing(shareOptions);
    const shareName = `RAMShare${hashValues(this.node.addr, ...principals)}`;
    new CfnResourceShare(this, shareName, {
      name: shareName,
      allowExternalPrincipals: shareOptions.allowExternalPrincipals ?? true,
      principals: principals,
      resourceArns: [this.attributeGroupArn],
    });
  }
}

/**
 * A Service Catalog AppRegistry Attribute Group.
 */
export class AttributeGroup extends AttributeGroupBase implements IAttributeGroup {
  /**
   * Imports an attribute group construct that represents an external attribute group.
   *
   * @param scope The parent creating construct (usually `this`).
   * @param id The construct's name.
   * @param attributeGroupArn the Amazon Resource Name of the existing AppRegistry attribute group
   */
  public static fromAttributeGroupArn(scope: Construct, id: string, attributeGroupArn: string): IAttributeGroup {
    const arn = cdk.Stack.of(scope).splitArn(attributeGroupArn, cdk.ArnFormat.SLASH_RESOURCE_SLASH_RESOURCE_NAME);
    const attributeGroupId = arn.resourceName;

    if (!attributeGroupId) {
      throw new Error('Missing required Attribute Group ID from Attribute Group ARN: ' + attributeGroupArn);
    }

    class Import extends AttributeGroupBase {
      public readonly attributeGroupArn = attributeGroupArn;
      public readonly attributeGroupId = attributeGroupId!;
    }

    return new Import(scope, id, {
      environmentFromArn: attributeGroupArn,
    });
  }

  public readonly attributeGroupArn: string;
  public readonly attributeGroupId: string;

  constructor(scope: Construct, id: string, props: AttributeGroupProps) {
    super(scope, id);

    this.validateAttributeGroupProps(props);

    const attributeGroup = new CfnAttributeGroup(this, 'Resource', {
      name: props.attributeGroupName,
      description: props.description,
      attributes: props.attributes,
    });

    this.attributeGroupArn = attributeGroup.attrArn;
    this.attributeGroupId = attributeGroup.attrId;
  }

  private validateAttributeGroupProps(props: AttributeGroupProps) {
    InputValidator.validateLength(this.node.path, 'attribute group name', 1, 256, props.attributeGroupName);
    InputValidator.validateRegex(this.node.path, 'attribute group name', /^[a-zA-Z0-9-_]+$/, props.attributeGroupName);
    InputValidator.validateLength(this.node.path, 'attribute group description', 0, 1024, props.description);
  }
}
