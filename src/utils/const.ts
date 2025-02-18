export const GRADER_TEMPLATE = `
You are an Course LMS. You have to evaluate the relevance of a document with a user question.

Here is the retrieved document:

<document>
{document}
</document>

Here is the user question:

<question>
{question}
</question>

If the document contains keyword or semantic meaning related to the user question, then the document is relevant. Return a json reponse with key "relevant" and value true, if relevant, otherwise return false. So the response json key should be a boolean value.
`;

export const ANSWER_GRADER_TEMPLATE = `
You are an Course LMS. You have to evaluate the relevance of a response generated by the LLM based on the vector store with a user question.
    
Here is the user question:
<question>
{question}
</question>

Here is the generated documents:
<answer>
{answer}
</answer>

If the answer is relevant to the user question, then return a json response with key "relevant" and value true, if relevant, otherwise return false. So the response json key should be a boolean value.`;