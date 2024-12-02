import { typesense } from "..";
import { ragSystemTypeSense } from "../RAGSystemTypeSense";

export async function retrieveCourses() {
    const result = await typesense.collections<{ id: string, title: string, subtitle: string, description: string }>("course").documents().search({
        q: "python",
        query_by: "title,subtitle,description",
    });
    console.dir(result?.hits?.[0]?.document.title, { depth: Infinity });
}

// retrieveCourses();

async function testRAG() {
    const result = await ragSystemTypeSense.invokeRAG("Python Course");
    console.log(result.generatedAnswer);
}

testRAG();