#!/bin/sh

APP_BASE="/Users/liu-w/Desktop/code_deploy"

# user-defined functions
. ${APP_BASE}/env_params/env_common.sh

echo "upload to pipeline!"

check_and_set_env $*
upload_to_pipeline_s3 
