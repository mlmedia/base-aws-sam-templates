/**
 * set up DynamoDB SDK clients to interact with table
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

/* Get the DynamoDB table name from environment variables */
//const tableName = process.env.TARGET_TABLE;
const tableName = "item-cms-items-table-dev";
/**
 * get all items in the table
 * TODO: add limit
 */
export const handler = async (event) => {
	if (event.httpMethod !== "GET") {
		throw new Error(
			`getAllItems only accept GET method, you tried: ${event.httpMethod}`
		);
	}
	/* log statements written to CloudWatch */
	console.info("received:", event);

	/**
	 * get all items from the table (only first 1MB data, you can use `LastEvaluatedKey` to get the rest of data)
	 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#scan-property
	 * https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html
	 */
	var params = {
		TableName: tableName,
	};

	try {
		const data = await ddbDocClient.send(new ScanCommand(params));
		var items = data.Items;
	} catch (err) {
		console.log("Error", err);
	}

	const response = {
		statusCode: 200,
		/* for CORS */
		headers: {
			"Access-Control-Allow-Headers": "Content-Type",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE,PATCH",
			"Access-Control-Allow-Credentials": true,
		},
		body: JSON.stringify(items),
		//body: JSON.stringify(params)
	};

	/* log statements written to CloudWatch */
	console.info(
		`response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`
	);
	return response;
};
