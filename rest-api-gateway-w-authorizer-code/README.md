# ItemCMS API built using SAM serverless

NOTE: Create the DynamoDB table manually and set with Delete Protection policies so we don't accidentally delete the data with a CloudFormation deployment. TODO: also do the same with any S3 buckets used so as to not inadvertently delete.

## Reference

-   AWS SAM CLI - [Install the AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)

-   Node.js - [Install Node.js 18](https://nodejs.org/en/), including the npm package management tool

-   Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community)

-   Backup strategies for Amazon DynamoDB: https://aws.amazon.com/blogs/database/backup-strategies-for-amazon-dynamodb/

-   AWS Amplify: Using Existing Auth and API Resources: https://dev.to/focusotter/aws-amplify-using-existing-auth-and-api-resources-30pg

### Local Development Setup

-   NOTE: Docker must be running in order to use the local endpoints

-   Start the API

```
sam local start-api
```

-   Endpoint will be a local IP address like `http://127.0.0.1:3000`. You can point requests in the front end application or Postman to those endpoints.

## Deployment

## DynamoDB Tables

(NOTE: we create these manually and refer in the SAM template in order to keep them separate from the CloudFormation template = avoiding possibility of accidental deletion, but also to be flexible using / recycling tables between environments / builds)

-   Manually create a DynamoDB table (TODO: add notes here)

### DEV Environment

First time deployment should use `--guided` flag:

```
sam deploy --guided
```

Option values:

```
Stack Name: item-cms-api-sam-dev
AWS Region: us-east-1 (default)
Parameter Env: dev
Parameter Domain: api-dev.item-cms.com
Parameter ZoneId: (NOTE: get value from creds sheet)
Parameter UserPoolArn: (NOTE: get ARN value from creds sheet)
Parameter ItemTable: (NOTE: get ARN value from creds sheet)
Confirm changes before deploy: N (default)
Allow SAM CLI IAM role creation: Y (default)
Disable rollback: N (default)
____ may not have authorization defined, Is this okay?: Y (NOTE: there will be multiple questions for each Lambda function)
Save arguments to configuration file: Y (default)
SAM configuration file: samconfig.toml (default)
SAM configuration environment: default
```

Subsequent deployments (dev is the default config env):

```
sam deploy
```

### PROD Environment

To deploy to another environment, like PROD, repeat the process above, but use the following during the `sam deploy --guided` process:

```
Stack Name: item-cms-api-sam-prod
AWS Region: us-east-1 (default)
Parameter Env: prod
Parameter Domain: api.item-cms.com
Parameter ZoneId: (NOTE: get ZoneID value from creds sheet)
Parameter UserPoolArn: (NOTE: get ARN value from creds sheet)
Parameter ItemTable: (NOTE: get ARN value from creds sheet = SHOULD BE DIFFERENT THAN DEV)
Confirm changes before deploy: N (default)
Allow SAM CLI IAM role creation: Y (default)
Disable rollback: N (default)
____ may not have authorization defined, Is this okay?: Y (NOTE: there will be multiple questions for each Lambda function)
Save arguments to configuration file: Y (default)
SAM configuration file: samconfig.toml (default)
SAM configuration environment: prod
```

Subsequent deployments:

```
sam deploy --config-env prod
```

## Safeguards

Due to the nature of SAM and Cloudformation, there are some separate steps that should be completed to protect data from accidental deletion or corruption.

### DynamoDB Table Deletion Protection

The template is configured to retain the table even when the SAM stack is deleted, it is an additional layer of protection to also turn on Deletion Protection in the AWS Console.

-   Go to DynamoDB
-   Select the appropriate table
-   In the "Additional Settings" tab on the right, scroll down to the section on Deletion Protection
-   Click the "Turn On" button

The table should now be protected from accidental deletion by the CLI or other method. To delete the table, the user would have to go the same section as described above and click the "Turn Off" button.

This is only a basic way to prevent the database from being deleted, but it does not replace a full disaster recovery system, especially for the production database. See here: https://aws.amazon.com/blogs/database/backup-strategies-for-amazon-dynamodb/

### API Key Setup (NOTE: for DEV+TESTING apps only - see Authorizer method for PROD apps below)

-   In the AWS Console, go to API Gateway
-   Select the API Gateway for the DEV environment (e.g. item-cms-api-dev)
-   In the left sidebar, select "API Keys"
-   Go to the Actions dropdown, and select "Create API Key"
-   Create a new API key and save the credentials
-   In the left sidebar, select "Usage Plans"
-   Click the "Create" button to create a new Usage Plan
-   Give it a name and the following settings (can be changed any time):

```
Enable throttling ON
Rate: 10 requests per second
Burst: 10 requests

Enable Quota ON
5000 requests per month
```

-   Click "Next"
-   Under "Associated API Stages", click "Add API Stage"
-   From the dropdown, select the appropriate environment (item-cms-api-dev) and stage name (main)
-   Click the checkbox and click Next
-   Click "Add API Key to Usage Plan"
-   Add the key created earlier
-   Click "Done"

\*\* (NOTE: due to issues with SAM and CORS configuration not working correctly, the API Key setup should be done manually)

-   Go to the API Gateway to the "Resources" tab
-   Select the GET method under the first path for the API (i.e. items/)
-   Click the Method Request link
-   For the dropdown for the "API Key Required", select TRUE and then click the checkbox next to it
-   Repeat for each of the GET, POST, PUT, and DELETE requests but do NOT set the API required for the OPTIONS request as it seems to break the "preflight request" from allowing the API Key requests from working correctly
-   Under the Actions dropdown in the Resources tab and when a path is selected (e.g. items/), select Enable CORS
-   Leave the default options selected, and click "Enable CORS and Replace existing CORS headers"
-   In the pop-up, confirm "Yes, replace existing values"
-   Under the Actions dropdown in the Resources tab, select Deploy API and deploy the API to the "main" branch
-   (NOTE: you may have to clear cache or create a new browser session for any front end JavaScript calls to the API to get past the CORS error message in the console)

### Authorizer set up (RECOMMENDED for PROD apps)

The Authorizer method uses Cognito as the identity provider and returns an authorization code upon successful login to be used to make requests to the API. This is better than the API key method because creating API keys for each user is burdensome.

For the below instructions, we will create a Cognito hosted UI to allow users to authenticate in order to use the API

## Step 1: Set up Certificate for a custom domain for the login (e.g. account.item-cms.com)

-   Go into the Certificate Manager
-   click "Request" button
-   Select "Request a public certificate" and click "Next" button
-   Under "Domain Names" and "Fully Qualified Domain Name" enter the value of the URL to be used (e.g. account.item-cms.com)
-   Keep the "DNS validation - recommended" box checked
    -   NOTE: the NS nameserver records may have to first point to the AWS hosted zone for the DNS validation method to work
-   Click the "Request" button
-   Click the View Certificate link when it pops up on the top of the Certificates list or refresh and find the new certificate and click it
-   Click "Create records in Route 53" link
-   Go back to the "Certificates" link and check that the Certificate is listed as "Issued"

#### Step 2: Create Cognito User Pool

-   Go to Cognito and click "Create user pool"
-   Leave the Federated identity box unchecked (not needed unless working with external identity sources)
-   Check the Email option under "Cognito user pool sign-in options"
    -   NOTE: Optionally select Username if desired
    -   NOTE: we are skipping the phone method due to extra set up with text messaging, but it can be configured if desired
-   Select desired "User name requirements" options (leave blank if unsure)
    -   NOTE: It is not recommended to set Username as case-sensitive, as that could introduce some conflict issues
-   Click "Next"

-   Under "Password policy" keep the "Cognito defaults" option selected or create your own custom password policy
-   Under the "Multi-factor authentication" section, select "Optional MFA"
-   Select the "Authenticator apps" as the MFA method (SMS will require additional configuration as described above)
-   Under the "User account recovery" section, select "Enable self-service account recovery"
-   Select "Email only" option
-   Click "Next"

-   Under the "Self-service sign-up", uncheck the "Enable self-registration" option until the production app is ready to be launched to the public
-   In the "Cognito-assisted verification and confirmation" section, select the "Allow Cognito to automatically send messages to verify and confirm" option
-   Select the "Send email message, verify email address" option
-   Leave the "Keep original attribute value active when an update is pending" checked
-   Leave the "Email address" option selected in the "Active attribute values when an update is pending" field
-   Ignore the remaining options and click "Next"

-   In the Email configuration section, "Send email with Amazon SES"
-   NOTE: Amazon SES will have to be configured with a verified email address in order to use this option (see Amazon SES documentation for how to set up)
-   Leave the option for "SES Region" set with the default
-   Choose the "FROM email address" from the verified email addresses you have set up with SES
-   Set the remaining options with your custom SES values or leave as default
-   Click "Next"

-   In the "User pool name" section, enter a name (e.g. item-cms-cognito-user-pool)
-   Check the box for "Use the Cognito Hosted UI"
-   In the section below, select the recommended "Use a custom domain" option
    -   NOTE: some additional configuration may be required with DNS. Follow any instructions on how to set up when selecting that option.
-   Enter your custom domain in the field (e.g. https://account.item-cms.com)
-   In the dropdown for "ACM certificate", choose the certificate created in Step 1 above

### NOTE on App Clients: You cannot use a client secret to use Amplify as a web app front end, so you will have to create at least one App Client without a client secret

### NOTE if using with a native application, you should also create an app client WITH a client secret

-   In the "Initial app client" section, select the Public Client option
-   Enter a name in the "App client name" field (e.g. item-cms-cognito-app-client)
-   Select the "Do Not Generate a client secret" option

-   Enter any callback URL in the "Allowed callback URLs" field. This value will redirect after successful login and should match the custom domain being used (e.g. https://account.item-cms.com/dashboard/)
-   In the "Advanced app client settings" section, keep the settings as default
    -   NOTE: The "OAuth 2.0 grant types" value should be set to "Authorization code grant". It is no longer recommended to use the "Implicit Grant" type due to security concerns.
-   Click "Next"

-   In the "Review and create" section, review all of the settings and ensure they match the desired configuration. Some settings cannot be changed after creating the pool
-   Click "Create user pool"

#### Step 3: Set up Authorizer with API Gateway

-   Select the API you wish to set up the Authorizer
-   Choose Authorizers in the left sidebar
-   Click "Create New Authorizer"
-   Give it a name (e.g. item-cms-cognito-authorizer)
-   Select Cognito as the Type
-   In the dropdown, select the Cognito User Pool created above
-   Enter "Authorization" in the "Token Source" field
-   Leave the "Token Validation" field blank
-   Click "Create"

#### Step 4: Attach Authorizer to all desired methods

-   From the API Gateway dashboard, select your API
-   Select "Resources" from the left sidebar
-   Click into one of the API methods (e.g. GET)
-   Select "Method Request"
-   Under "Settings", click the pencil icon next to Authorization
-   In the dropdown, select the Authorizer created above
    -   NOTE: it may take several minutes before it appears in the dropdown
-   Click the little checkmark to save
-   Repeat for each Method Request in the API (e.g. GET, POST, PUT)

-   TODO: set up instructions for OAuth scopes to prevent DELETE method, for example
-   NOTE: this may not be necessary if not using sensitive actions / methods in the public exposed endpoints. Maybe create a separate admin-actions API separately that manipulates the same tables?

## Testing API requests (with the API Key method)

### Via cURL

-   type a cURL request in the terminal:

```
curl -X GET https://api.item-cms.com/items/ -H 'x-api-key: {YOUR-API-KEY-12345}'
```

### Via Postman

-   Open Postman

### POST / PUT request

This request is for adding and updating a record to the table.

-   Create a new request for POST at the following URL endpoint configured by SAM, for example:

```
https://dev.item-cms.com/
```

-   Under the Headers tab, add a key for `x-api-key` and in the value field, use the API Key value created for the API Key created above

-   Under the Body tab, add the following JSON request body:

```
{
    "id": "123",
	"name": "Test Name",
	"title": "Test Title",
	"desc": "Test description"
}
```

-   Click Send

-   Repeat the process with several other request Body values, changing the ID so as not to overwrite the previous request

-   To UPDATE the record, simple pass the same ID with different values for the other fields, and they will be updated. The ID is never updated. NOTE: This ideally will be protected from accidental or malicious overwriting by putting in place middleware that checks authorization. TODO: set up authorization / ownership per item and / or set up a versioning system for each item.

### GET request

-   Create a new request for GET at the following URL endpoint configured by SAM, for example:

```
https://dev.item-cms.com/
```

-   Under the Headers tab, add a key for `x-api-key` and in the value field, use the API Key value created for the API Key created above

-   Click Send

-   Successful response will display the values created in the POST request step above

### GET Item by ID

-   Create a new request for GET at the following URL endpoint with the appropriate ID appended to the end of the URL. For example:

```
https://dev.item-cms.com/123
```

-   Under the Headers tab, add a key for `x-api-key` and in the value field, use the API Key value created for the API Key created above

-   Click Send

-   Successful response will display the values created in the POST request step above

## Testing API requests (with the Authorizer method)

### Via cURL

#### Get the Base64 client ID + secret code

-   Find the Client ID and Client Secret for the Client App and convert to Base64 using the following command in the terminal:

```
echo -n <client id>:<client secret> | base64
```

    - NOTE: see the creds notes for the specific testing values

-   Copy that result (e.g. Acbde12345Defgh67890xxxxxXXXXX)

#### Get the Authentication Code

-   Go to the authentication URL (e.g. https://account.item-cms.com/login?client_id=4u6qpg62hggl79o8m051ckvh58&response_type=code&scope=email+openid+phone&redirect_uri=https%3A%2F%2Faccount.item-cms.com) and enter the username and password

-   Upon successful login, you will be redirected to the callback URL with an authentication code passed back to the "code" parameter in the URL (e.g. https://account.item-cms.com/?code=a5d38c9f-e376-4ba9-a4f6-deaf292c4034)

    -   NOTE: for security purposes, this code is only valid for 5 minutes

-   Copy the code

-   In the terminal, make the following cURL request:

```
curl --location --request GET <request URL> \
--header 'Authorization: Basic <base64 encoded client credentials>' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'code=<authorization code>' \
--data-urlencode 'grant_type=authorization_code' \
--data-urlencode 'redirect_uri=<callback url>'
```

For example:

```
curl --location --request GET https://api.item-cms.com/items/ \
--header 'Authorization: Basic <N2wwdXN2c2Y5MWJhaWptM2txNmZqcXIyamg6amI4dTFobzQxMWg3dTNoa2lvb3E1cWhsYmYwZHFxcTQyZ3B1bmY3dWdrY2p2bmlscWdp>' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'code=b622a32e-3634-4d2e-9031-390567a60f5c' \
--data-urlencode 'grant_type=authorization_code' \
--data-urlencode 'redirect_uri=https://account.item-cms.com/dashboard'
```

## Setting up CloudWatch logs for the API Gateway

-   Set up the role for API Gateway and add the policy "AmazonAPIGatewayPushToCloudWatchLogs"

-   ARN created: arn:aws:iam::350135973898:role/api-gateway-role-to-push-to-cloudwatch

===== TODO CONTINUE HERE - STILL NOT WORKING =====

## Deleting the SAM / CloudFormation stack

```
aws cloudformation delete-stack --stack-name item-cms-api-sam-dev
aws cloudformation delete-stack --stack-name item-cms-api-sam-prod
```

NOTE: this will not delete the table through the SAM CLI. The table will have to be deleted manually through the AWS Console.
