#!/bin/sh

APP_BASE="/Users/liu-w/Desktop/code_deploy"

# user-defined functions
. ${APP_BASE}/env_params/env_common.sh

echo "deploy pipeline!"

check_and_set_env $*

echo "APP_BASE="${APP_BASE}
echo "DeployBucket="$DeployBucket
echo "EnvironmentName="${EnvironmentName}
deploy_pipeline_s3 \
    ${APP_BASE}/pipeline_html.yaml \
    $DeployBucket \
    ${EnvironmentName}-hosting-cloudfront-CloudFront
add_tag_to_log_group
