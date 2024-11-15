import * as path from 'path';
import { type CloudFormationStackArtifact, type Environment, EnvironmentPlaceholders } from '@aws-cdk/cx-api';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getEndpointFromInstructions } from '@smithy/middleware-endpoint';
import * as chalk from 'chalk';
import * as fs from 'fs-extra';
import { debug, error } from '../../logging';
import { toYAML } from '../../serialize';
import { AssetManifestBuilder } from '../../util/asset-manifest-builder';
import { AssetsPublishedProof } from '../../util/asset-publishing';
import { contentHash } from '../../util/content-hash';
import { TargetEnvironment } from '../environment-access';

export type TemplateBodyParameter = {
  TemplateBody?: string;
  TemplateURL?: string;
};

const LARGE_TEMPLATE_SIZE_KB = 50;

type MakeBodyParameterResult =
  | { type: 'direct'; param: TemplateBodyParameter }
  | { type: 'upload'; addToManifest: (builder: AssetManifestBuilder) => TemplateBodyParameter };

/**
 * Prepares the body parameter for +CreateChangeSet+.
 *
 * If the template has already been uploaded to an asset bucket or the template
 * is small enough to be inlined into the API call, returns a 'direct' type response
 * with can go into the CloudFormation API call. The `_assetsPublishedProof` parameter
 * exists to statically prove that `publishAssets` has been called already.
 *
 * Otherwise, returns an object with an `addToManifest` function; call that with an `AssetManifestBuilder`
 * (and publish the added artifacts!) to obtain the CloudFormation API call parameters.
 * there is no staging bucket, an error is thrown.
 */
export async function makeBodyParameter(
  stack: CloudFormationStackArtifact,
  env: TargetEnvironment,
  _assetsPublishedProof: AssetsPublishedProof,
  overrideTemplate?: unknown,
): Promise<MakeBodyParameterResult> {

  // If the template has already been uploaded to S3, just use it from there.
  if (stack.stackTemplateAssetObjectUrl && !overrideTemplate) {
    return {
      type: 'direct',
      param: { TemplateURL: await restUrlFromManifest(stack.stackTemplateAssetObjectUrl, env.resolvedEnvironment) },
    };
  }

  // Otherwise, pass via API call (if small) or upload here (if large)
  const templateJson = toYAML(overrideTemplate ?? stack.template);

  if (templateJson.length <= LARGE_TEMPLATE_SIZE_KB * 1024) {
    return { type: 'direct', param: { TemplateBody: templateJson } };
  }

  const toolkitInfo = await env.resources.lookupToolkit();
  if (!toolkitInfo.found) {
    error(
      `The template for stack "${stack.displayName}" is ${Math.round(templateJson.length / 1024)}KiB. ` +
      `Templates larger than ${LARGE_TEMPLATE_SIZE_KB}KiB must be uploaded to S3.\n` +
      'Run the following command in order to setup an S3 bucket in this environment, and then re-deploy:\n\n',
      chalk.blue(`\t$ cdk bootstrap ${env.resolvedEnvironment.name}\n`));

    throw new Error('Template too large to deploy ("cdk bootstrap" is required)');
  }

  const templateHash = contentHash(templateJson);
  const key = `cdk/${stack.id}/${templateHash}.yml`;

  let templateFile = stack.templateFile;
  if (overrideTemplate) {
    // Add a variant of this template
    templateFile = `${stack.templateFile}-${templateHash}.yaml`;
    const templateFilePath = path.join(stack.assembly.directory, templateFile);
    await fs.writeFile(templateFilePath, templateJson, { encoding: 'utf-8' });
  }

  return {
    type: 'upload',
    addToManifest(builder) {
      builder.addFileAsset(templateHash, {
        path: templateFile,
      }, {
        bucketName: toolkitInfo.bucketName,
        objectKey: key,
      });

      const templateURL = `${toolkitInfo.bucketUrl}/${key}`;
      debug('Storing template in S3 at:', templateURL);
      return { TemplateURL: templateURL };
    },
  };

}

/**
 * Format an S3 URL in the manifest for use with CloudFormation
 *
 * Replaces environment placeholders (which this field may contain),
 * and reformats s3://.../... urls into S3 REST URLs (which CloudFormation
 * expects)
 */
async function restUrlFromManifest(url: string, environment: Environment): Promise<string> {
  const doNotUseMarker = '**DONOTUSE**';
  const region = environment.region;
  // This URL may contain placeholders, so still substitute those.
  url = EnvironmentPlaceholders.replace(url, {
    accountId: environment.account,
    region,
    partition: doNotUseMarker,
  });

  // Yes, this is extremely crude, but we don't actually need this so I'm not inclined to spend
  // a lot of effort trying to thread the right value to this location.
  if (url.indexOf(doNotUseMarker) > -1) {
    throw new Error("Cannot use '${AWS::Partition}' in the 'stackTemplateAssetObjectUrl' field");
  }

  const s3Url = url.match(/s3:\/\/([^/]+)\/(.*)$/);
  if (!s3Url) {
    return url;
  }

  // We need to pass an 'https://s3.REGION.amazonaws.com[.cn]/bucket/object' URL to CloudFormation, but we
  // got an 's3://bucket/object' URL instead. Construct the rest API URL here.
  const bucketName = s3Url[1];
  const objectKey = s3Url[2];

  // SDK v3 no longer allows for getting endpoints from only region.
  // A command and client config must now be provided.
  const s3 = new S3Client({ region });
  const endpoint = await getEndpointFromInstructions({}, HeadObjectCommand, {
    ...s3.config,
  });
  endpoint.url.hostname;

  return `${endpoint.url.origin}/${bucketName}/${objectKey}`;
}
