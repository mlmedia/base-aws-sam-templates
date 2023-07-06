// posts.js

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Create a post
exports.createPost = async (event) => {
	try {
		const { body } = event;
		const post = JSON.parse(body);

		const params = {
			TableName: 'sam-crud-template-posts',
			Item: {
				postId: post.postId,
				title: post.title,
				content: post.content,
			},
		};

		await dynamodb.put(params).promise();

		return {
			statusCode: 201,
			body: JSON.stringify({ message: 'Post created successfully' }),
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({ message: 'Internal server error' }),
		};
	}
};

// Read a post
exports.readPost = async (event) => {
	try {
		const { pathParameters } = event;
		const { postId } = pathParameters;

		const params = {
			TableName: 'sam-crud-template-posts',
			Key: {
				postId: postId,
			},
		};

		const result = await dynamodb.get(params).promise();
		const post = result.Item;

		if (!post) {
			return {
				statusCode: 404,
				body: JSON.stringify({ message: 'Post not found' }),
			};
		}

		return {
			statusCode: 200,
			body: JSON.stringify(post),
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({ message: 'Internal server error' }),
		};
	}
};

// Update a post
exports.updatePost = async (event) => {
	try {
		const { pathParameters, body } = event;
		const { postId } = pathParameters;
		const post = JSON.parse(body);

		const params = {
			TableName: 'sam-crud-template-posts',
			Key: {
				postId: postId,
			},
			UpdateExpression: 'set title = :title, content = :content',
			ExpressionAttributeValues: {
				':title': post.title,
				':content': post.content,
			},
			ReturnValues: 'ALL_NEW',
		};

		const result = await dynamodb.update(params).promise();
		const updatedPost = result.Attributes;

		return {
			statusCode: 200,
			body: JSON.stringify(updatedPost),
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({ message: 'Internal server error' }),
		};
	}
};

// Delete a post
exports.deletePost = async (event) => {
	try {
		const { pathParameters } = event;
		const { postId } = pathParameters;

		const params = {
			TableName: 'sam-crud-template-posts',
			Key: {
				postId: postId,
			},
		};

		await dynamodb.delete(params).promise();

		return {
			statusCode: 200,
			body: JSON.stringify({ message: 'Post deleted successfully' }),
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({ message: 'Internal server error' }),
		};
	}
};
