/**
 * set up DynamoDB SDK clients to interact with table
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

/* Get the DynamoDB table name from environment variables */
const tableName = process.env.TARGET_TABLE;

/**
 * A simple example includes a HTTP post method to add one item to a DynamoDB table.
 */
export const handler = async (event) => {
	if (event.httpMethod !== 'POST') {
		throw new Error(`postMethod only accepts POST method, you tried: ${event.httpMethod} method.`);
	}
	/* log statements written to CloudWatch */
	console.info('received:', event);

	/* Get ID and name from the body of the request */
	const body = JSON.parse(event.body);
	const id = body.id;
	const name = body.name;
	const title = body.title;
	const desc = body.desc;

	/** 
	 * Creates a new item, or replaces an old item with a new item
	 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#put-property 
	 */
	var params = {
		TableName: tableName,
		Item: { 
			id: id, 
			name: name,
			title: title,
			desc: desc
		}
	};

	try {
		const data = await ddbDocClient.send(new PutCommand(params));
		console.log("Success - item added or updated", data);
	} catch (err) {
		console.log("Error", err.stack);
	}

	const response = {
		statusCode: 200,
		body: JSON.stringify(body)
	};

	/* log statements written to CloudWatch */
	console.info(`response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`);
	return response;
};
