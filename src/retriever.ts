import { typesense } from ".";

export async function retrieveCourses() {
    const result = await typesense.collections("course").documents().search({
        q: "aws",
        query_by: "title,subtitle,description",
    });
    console.dir(result?.hits?.[0]?.document, { depth: Infinity });
}

retrieveCourses();