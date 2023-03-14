# [Curve Fitting Vue Application](https://d3uvvhom913tgh.cloudfront.net/)

The home page(ais_qs_embedurl.html) is currently placed elsewhere though.

## CodePipeline Deploy
1. Make sure your AWS SSO Configuration is updated.
```
aws sso login --profile sea_vp_dev
```
2. Execute the upload_to_pipeline.sh script
```
./upload_to_pipeline.sh dev
```

## Local development AWS credentials
1. To fetch AWS resources on localhosts, please copy the following three values from your AWS management console  
`AWS Access Key ID`  
`AWS Secret Access Key`  
`AWS Session Token`  

2. Paste these values to `curve-fit/src/.env`  
`VITE_AWS_ACCESS_KEY_ID`  
`VITE_AWS_SECRET_ACCESS_KEY`  
`VITE_AWS_SESSION_TOKEN`  

By doing so, VITE can treat these credentials as environment variables, and these variables can be contained in the Authorization in the header of a HTTP request.  
The localhost website should be opened using the "https://dev.localhost:3000/" in coordinate with Quicksight settings.
