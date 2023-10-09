/**
 * set up DynamoDB SDK clients to interact with table
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

/* Get the DynamoDB table name from environment variables */
const tableName = process.env.TARGET_TABLE;

/**
 * get one item by ID
 */
export const handler = async (event) => {
	if (event.httpMethod !== 'GET') {
		throw new Error(`getMethod only accept GET method, you tried: ${event.httpMethod}`);
	}
	/* log statements written to CloudWatch */
	console.info('received:', event);

	/* Get ID from pathParameters from APIGateway because of `/{id}` at template.yaml */
	const id = event.pathParameters.id;

	/** 
	 * get the item from the table
	 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#get-property 
	 */
	var params = {
		TableName: tableName,
		Key: { id: id },
	};

	try {
		const data = await ddbDocClient.send(new GetCommand(params));
		var item = data.Item;
	} catch (err) {
		console.log("Error", err);
	}

	const response = {
		statusCode: 200,
		/* for CORS */
		headers: {
			"Access-Control-Allow-Headers" : "Content-Type",
			"Access-Control-Allow-Origin": "*", 
			"Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE,PATCH",
			//"Access-Control-Allow-Credentials": true
		},
		body: JSON.stringify(item)
	};

	/* log statements written to CloudWatch */
	console.info(`response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`);
	return response;
}
